import {
  forwardRef,
  Inject,
  Injectable,
  Logger,
  NotFoundException,
  BadRequestException,
} from "@nestjs/common";
import { PaginationDto } from "src/common/dto/pagination.dto";
import { PaginatedResponseDto } from "src/common/dto/pagination-response.dto";
import { I18nService } from "nestjs-i18n";
import { CreateUpdateShopDto } from "./dto/create-update-shop.dto";
import { ProductsService } from "src/products/products.service";
import { UsersService } from "src/users/users.service";
import { FileUploadService } from "src/common/file-upload/file-upload.service";
import { ClsService } from "nestjs-cls";
import { OrdersService } from "src/orders/orders.service";
import { assertOwnerOrPermission } from "src/common/utils/permission.utils";
import { PermissionEntry } from "src/common/constants/admin-permissions.constants";
import { EmailService } from "src/common/email-service/email-service";
import { EmailLogService } from "src/email-log/email-log.service";
import { PrismaService } from "src/prisma/prisma.service";
import { GeoRepository } from "src/prisma/repositories/geo.repository";
import { generateObjectId, isObjectIdLike } from "src/common/utils/object-id.util";
import { toGeoJson, toLatLng, withGeoJson } from "src/common/utils/geo.util";
import { SHOP_INCLUDE, type Shop } from "./model/shop.model";
import { Prisma } from "../../generated/prisma/client";
import { resolvePagination } from "../common/utils/pagination.util";

/** Shared filter fragment: the geo searches only ever return enabled shops. */
const SHOP_ENABLED = Prisma.sql`is_disabled = false`;

@Injectable()
export class ShopService {
  private readonly logger = new Logger(ShopService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly geoRepository: GeoRepository,
    @Inject(forwardRef(() => ProductsService))
    private readonly productsService: ProductsService,
    @Inject(forwardRef(() => UsersService))
    private readonly usersService: UsersService,
    private readonly fileUploadService: FileUploadService,
    @Inject(forwardRef(() => OrdersService))
    private readonly ordersService: OrdersService,
    private readonly i18n: I18nService,
    private readonly cls: ClsService,
    private readonly emailService: EmailService,
    private readonly emailLogService: EmailLogService,
  ) {}

  private get lang(): string {
    return this.cls?.get("lang") ?? "en";
  }

  /**
   * Rebuilds the document shape clients expect: `location` as GeoJSON, the
   * owner relation back under `ownerId`, and `_id` alongside `id`.
   */
  private toApiShape<T extends Record<string, any>>(shop: T | null): any {
    if (!shop) return shop;
    const { owner, ...rest } = shop as any;
    const shaped = withGeoJson(rest as any);
    return {
      ...shaped,
      _id: (shaped as any).id,
      // The relation is named `owner`; the API field has always been `ownerId`.
      ownerId: owner ?? (shaped as any).ownerId,
    };
  }

  /** Fire-and-forget: creation must succeed even if the email provider is down. */
  private sendShopCreatedEmail(
    name: string,
    email: string,
    shopId: string,
    shopCode?: string | null,
  ) {
    const shopUrl = `${process.env.FRONTEND_URL}/selling/shop-detail?id=${shopId}`;
    const html = `
      <h2>Your shop has been created</h2>
      <p>Hi ${name},</p>
      <p>Your shop has been created successfully. You can now start listing products for sale.</p>
      <p><a href="${shopUrl}">${shopUrl}</a></p>
    `;
    this.emailService
      .sendEmail(email, "Your shop has been created", html)
      .then(() =>
        this.emailLogService.record({
          eventType: "shop_created",
          recipient: email,
          relatedRecordId: shopCode ?? undefined,
          deliveryStatus: "sent",
        }),
      )
      .catch((err) => {
        this.logger.error(`Shop-created email to ${email} failed`, err);
        void this.emailLogService.record({
          eventType: "shop_created",
          recipient: email,
          relatedRecordId: shopCode ?? undefined,
          deliveryStatus: "failed",
        });
      });
  }

  /** Atomically reserves the next sequential shop code (e.g. SHP-000083). */
  private async generateNextShopCode(): Promise<string> {
    const counter = await this.prisma.counter.upsert({
      where: { id: "shopCode" },
      create: { id: "shopCode", seq: 1 },
      update: { seq: { increment: 1 } },
    });
    return `SHP-${String(counter.seq).padStart(6, "0")}`;
  }

  /** A user can own at most this many shops at once. A shop an admin has
   *  disabled doesn't count against it — the same "isDisabled: false" scoping
   *  every other shop-count query in this service already uses. */
  private static readonly MAX_SHOPS_PER_OWNER = 3;

  async createShop(ownerId: string, dto: CreateUpdateShopDto) {
    const ownerIdStr = ownerId;
    const existingUser = await this.usersService.findUserById(ownerIdStr);
    if (!existingUser) {
      throw new NotFoundException(
        this.i18n.translate("auth.shop.user_not_found", { lang: this.lang }),
      );
    }

    const shopCount = await this.prisma.shop.count({
      where: { ownerId: ownerIdStr, isDisabled: false },
    });
    if (shopCount >= ShopService.MAX_SHOPS_PER_OWNER) {
      throw new BadRequestException(
        this.i18n.translate("auth.shop.shop_limit_reached", { lang: this.lang }),
      );
    }

    const { image: imageFile, banner: bannerFile } = dto as any;
    const shopCode = await this.generateNextShopCode();
    const shopId = generateObjectId();
    const { latitude, longitude } = toLatLng(dto.location);

    await this.prisma.shop.create({
      data: {
        id: shopId,
        shopCode,
        ownerId: ownerIdStr,
        title: dto.title,
        address: dto.address,
        description: dto.description ?? "",
        categoryId: dto.category,
        subcategoryId: dto.subcategory || null,
        marketName: dto.marketName ?? null,
        area: dto.area ?? "",
        city: dto.city ?? "",
        contact: dto.contact ?? "",
        openingHours: dto.openingHours ?? null,
        latitude,
        longitude,
      },
    });

    const updatePayload: Prisma.ShopUpdateInput = {};

    if (imageFile) {
      updatePayload.image = await this.fileUploadService.uploadShopImage(shopId, imageFile);
    }
    if (bannerFile) {
      updatePayload.banner = await this.fileUploadService.uploadShopBanner(shopId, bannerFile);
    }

    const results =
      Object.keys(updatePayload).length > 0
        ? await this.prisma.shop.update({ where: { id: shopId }, data: updatePayload })
        : await this.prisma.shop.findUniqueOrThrow({ where: { id: shopId } });

    this.sendShopCreatedEmail(
      existingUser.name,
      existingUser.email,
      shopId,
      results.shopCode,
    );

    return {
      message: this.i18n.translate("auth.shop.created_success", { lang: this.lang }),
      data: this.toApiShape(results),
    };
  }

  async updateShop(
    shopId: string,
    dto: CreateUpdateShopDto,
    currentUser?: { sub: string; roles?: string[]; permissions?: PermissionEntry[] },
  ): Promise<{ message: string; data: Shop }> {
    const existingShop = await this.prisma.shop.findUnique({ where: { id: shopId } });
    if (!existingShop) {
      throw new NotFoundException(
        this.i18n.translate("auth.shop.shop_not_found", { lang: this.lang }),
      );
    }

    if (currentUser) {
      assertOwnerOrPermission(currentUser, existingShop.ownerId ?? "", "shops", "edit");
    }

    const { image, banner } = dto as any;
    const data: Prisma.ShopUpdateInput = {};

    if (dto.title !== undefined) data.title = dto.title;
    if (dto.address !== undefined) data.address = dto.address;
    if (dto.description !== undefined) data.description = dto.description;
    if (dto.marketName !== undefined) data.marketName = dto.marketName;
    if (dto.area !== undefined) data.area = dto.area;
    if (dto.city !== undefined) data.city = dto.city;
    if (dto.contact !== undefined) data.contact = dto.contact;
    if (dto.openingHours !== undefined) data.openingHours = dto.openingHours;

    if (dto.category) {
      data.category = { connect: { id: dto.category } };
    }

    if (dto.subcategory) {
      data.subcategory = { connect: { id: dto.subcategory } };
    } else if (dto.subcategory === null || (dto.subcategory as unknown) === "") {
      data.subcategory = { disconnect: true }; // allow clearing subcategory
    }

    if (dto.location) {
      const { latitude, longitude } = toLatLng(dto.location);
      data.latitude = latitude;
      data.longitude = longitude;
    }

    // Handle image upload
    if (image) {
      data.image = await this.fileUploadService.uploadShopImage(shopId, image);
    }

    // Handle banner upload
    if (banner) {
      data.banner = await this.fileUploadService.uploadShopBanner(shopId, banner);
    }

    const updated = await this.prisma.shop.update({ where: { id: shopId }, data });

    // Sync location to products if location was updated
    if (dto.location) {
      void this.productsService.updateLocationByShopId(shopId, dto.location);
    }

    return {
      message: this.i18n.translate("auth.shop.updated_success", { lang: this.lang }),
      data: this.toApiShape(updated),
    };
  }

  /** Lightweight ownership lookup, used to let a shop owner act on their own resources
   *  (e.g. deleting their own listing) without a full shop fetch. */
  async getShopOwnerId(shopId: string): Promise<string | null> {
    const shop = await this.prisma.shop.findUnique({
      where: { id: shopId },
      select: { ownerId: true },
    });
    return shop?.ownerId ?? null;
  }

  async getShopById(shopId: string) {
    const shop = await this.prisma.shop.findUnique({
      where: { id: shopId },
      include: SHOP_INCLUDE,
    });

    if (!shop) {
      throw new NotFoundException(
        this.i18n.translate("auth.shop.shop_not_found", { lang: this.lang }),
      );
    }

    const [productsCount, ordersCount, totalViews, uniqueVisitorsCount, contactClicks, whatsappClicks] =
      await Promise.all([
        this.productsService.getAllProductsByShop(shopId, { page: 1, limit: 1 }),
        this.ordersService.getOrdersByOwner(shopId, "Shop", 1, 1),
        // Total Views: distinct users who have opened the shop's own page (deduped, forever).
        this.prisma.shopView.count({ where: { shopId } }),
        // Unique Visitors: distinct users who have opened at least one product from this shop.
        this.prisma.shopProductView.count({ where: { shopId } }),
        // Contact/WhatsApp Clicks: distinct users who've clicked, deduped forever.
        this.prisma.shopContactClick.count({ where: { shopId } }),
        this.prisma.shopWhatsappClick.count({ where: { shopId } }),
      ]);

    return {
      ...this.toApiShape(shop),
      productsCount: productsCount.meta.total,
      ordersCount: ordersCount.meta.total,
      totalViews,
      uniqueVisitorsCount,
      contactClicks,
      whatsappClicks,
    };
  }

  /**
   * The four tracking calls below were byte-identical apart from the collection.
   * Each dedupes per (shop, user) so a count of rows is the metric, and each
   * skips the owner looking at their own shop.
   */
  private async trackShopEngagement(
    kind: "view" | "productView" | "contactClick" | "whatsappClick",
    shopId: string,
    userId: string,
  ): Promise<void> {
    if (!isObjectIdLike(shopId) || !isObjectIdLike(userId)) return;

    const shop = await this.prisma.shop.findUnique({
      where: { id: shopId },
      select: { ownerId: true },
    });
    if (!shop || shop.ownerId === userId) return;

    const where = { shopId_userId: { shopId, userId } };
    const create = { id: generateObjectId(), shopId, userId };

    // `update: {}` leaves an existing row untouched, exactly as $setOnInsert did.
    switch (kind) {
      case "view":
        await this.prisma.shopView.upsert({ where, create, update: {} });
        return;
      case "productView":
        await this.prisma.shopProductView.upsert({ where, create, update: {} });
        return;
      case "contactClick":
        await this.prisma.shopContactClick.upsert({ where, create, update: {} });
        return;
      case "whatsappClick":
        await this.prisma.shopWhatsappClick.upsert({ where, create, update: {} });
        return;
    }
  }

  /** Records a shop-page view, deduped per (shop, user). Skips the owner viewing their own shop. */
  async trackView(shopId: string, userId: string): Promise<void> {
    return this.trackShopEngagement("view", shopId, userId);
  }

  /** Records that a user opened a product belonging to this shop (deduped per shop+user, regardless of which product). */
  async trackProductView(shopId: string, userId: string): Promise<void> {
    return this.trackShopEngagement("productView", shopId, userId);
  }

  /** Records a "Chat Store" click attributed to the shop. Deduped per (shop, user). */
  async trackContactClick(shopId: string, userId: string): Promise<void> {
    return this.trackShopEngagement("contactClick", shopId, userId);
  }

  /** Records a "WhatsApp" click attributed to the shop. Deduped per (shop, user). */
  async trackWhatsappClick(shopId: string, userId: string): Promise<void> {
    return this.trackShopEngagement("whatsappClick", shopId, userId);
  }

  async getAllShopsByUser(userId: string): Promise<Shop[]> {
    const shops = await this.prisma.shop.findMany({
      where: { ownerId: userId },
      include: {
        category: { select: { id: true, name: true } },
        subcategory: { select: { id: true, name: true } },
      },
    });
    return shops.map((s) => this.toApiShape(s));
  }

  async getAllShopsByUserPaginated(
    userId: string,
    paginationDto: PaginationDto,
  ): Promise<PaginatedResponseDto<Shop>> {
    const { page: rawPage, limit: rawLimit } = paginationDto;
    const { page, limit, skip } = resolvePagination(rawPage, rawLimit);
    const where = { ownerId: userId };

    const [shops, total] = await Promise.all([
      this.prisma.shop.findMany({
        where,
        orderBy: { createdAt: "desc" },
        skip,
        take: limit,
      }),
      this.prisma.shop.count({ where }),
    ]);

    return {
      data: shops.map((s) => this.toApiShape(s)),
      meta: { total, page, limit, totalPages: Math.ceil(total / limit) },
    };
  }

  async getAllShops(paginationDto: PaginationDto): Promise<PaginatedResponseDto<Shop>> {
    const { page: rawPage, limit: rawLimit, search, startDate, endDate } = paginationDto;
    const { page, limit, skip } = resolvePagination(rawPage, rawLimit);

    const where: Prisma.ShopWhereInput = {};

    if (search?.trim()) {
      const term = search.trim();
      where.OR = [
        { title: { contains: term, mode: "insensitive" } },
        { shopCode: { contains: term, mode: "insensitive" } },
      ];
    }

    if (startDate || endDate) {
      const createdAt: Prisma.DateTimeFilter = {};
      if (startDate) createdAt.gte = new Date(startDate);
      if (endDate) {
        const endOfDay = new Date(endDate);
        endOfDay.setHours(23, 59, 59, 999);
        createdAt.lte = endOfDay;
      }
      where.createdAt = createdAt;
    }

    const [shops, total] = await Promise.all([
      this.prisma.shop.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: "desc" },
      }),
      this.prisma.shop.count({ where }),
    ]);

    return {
      data: shops.map((s) => this.toApiShape(s)),
      meta: { total, page, limit, totalPages: Math.ceil(total / limit) },
    };
  }

  async setShopDisabled(shopId: string, disabled: boolean) {
    const existing = await this.prisma.shop.findUnique({ where: { id: shopId } });
    if (!existing) {
      throw new NotFoundException(
        this.i18n.translate("auth.shop.shop_not_found", { lang: this.lang }),
      );
    }
    const shop = await this.prisma.shop.update({
      where: { id: shopId },
      data: { isDisabled: disabled },
    });
    return this.toApiShape(shop);
  }

  async setShopsDisabledBulk(shopIds: any[], disabled: boolean) {
    await this.prisma.shop.updateMany({
      where: { id: { in: shopIds.map((id) => String(id)) } },
      data: { isDisabled: disabled },
    });
  }

  // Original simple near-query kept for backward compatibility
  async findShopsNearLocation(
    location: [number, number],
    radiusInMeters: number,
  ): Promise<Shop[]> {
    const [longitude, latitude] = location;

    const { ids, distances } = await this.geoRepository.findNearby({
      table: "shops",
      longitude,
      latitude,
      radiusMeters: radiusInMeters,
      filters: [SHOP_ENABLED],
      take: 1000,
      order: "distance",
    });

    if (ids.length === 0) return [];

    const shops = await this.prisma.shop.findMany({
      where: { id: { in: ids }, isDisabled: false },
      include: SHOP_INCLUDE,
    });

    return GeoRepository.reorder(shops, ids).map((s) => ({
      ...this.toApiShape(s),
      distance: distances.get(s.id),
    }));
  }

  // New paginated geo search that returns meta and data
  async findShopsNearLocationPaginated(
    location: [number, number],
    radiusInMeters: number,
    pagination?: PaginationDto,
  ): Promise<PaginatedResponseDto<Shop>> {
    const { page: rawPage, limit: rawLimit } = pagination || {};
    const { page, limit, skip } = resolvePagination(rawPage, rawLimit);
    const [longitude, latitude] = location;

    const { ids, distances, total } = await this.geoRepository.findNearby({
      table: "shops",
      longitude,
      latitude,
      radiusMeters: radiusInMeters,
      filters: [SHOP_ENABLED],
      skip,
      take: limit,
      // The old pipeline filtered by $geoNear but then re-sorted by createdAt,
      // so newest-first is the behaviour being preserved here, not nearest-first.
      order: "newest",
    });

    if (ids.length === 0) {
      return {
        meta: { total, page, limit, totalPages: Math.ceil(total / limit) },
        data: [],
      };
    }

    const shops = await this.prisma.shop.findMany({
      where: { id: { in: ids } },
      include: {
        category: { select: { id: true, name: true } },
        subcategory: { select: { id: true, name: true } },
      },
    });

    const data = GeoRepository.reorder(shops, ids).map((s) => ({
      ...this.toApiShape(s),
      distance: distances.get(s.id),
    }));

    return {
      meta: { total, page, limit, totalPages: Math.ceil(total / limit) },
      data,
    };
  }
}
