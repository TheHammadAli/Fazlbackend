import {
  Injectable,
  NotFoundException,
  InternalServerErrorException,
  ForbiddenException,
  BadRequestException,
  Inject,
  Logger,
  forwardRef,
} from "@nestjs/common";
import { I18nService } from "nestjs-i18n";
import { CreateProductDto } from "./dto/create-product.dto";
import { UpdateProductDto } from "./dto/update-product.dto";
import { PaginationDto } from "src/common/dto/pagination.dto";
import { PaginatedResponseDto } from "src/common/dto/pagination-response.dto";
import { ShopService } from "src/shop/shop.service";
import { ListingUtilsService } from "src/shared/listing-util-service";
import { UsersService } from "src/users/users.service";
import { SearchAllProductsServiceDto } from "src/search/dto/product-service-search-for.dto";
import { FileUploadService } from "src/common/file-upload/file-upload.service";
import { PromotionService } from "src/promotion/promotion.service";
import { ClsService } from "nestjs-cls";
import { LikeService } from "src/like/like.service";
import { ShareService } from "src/share/share.service";
import { ReviewService } from "src/reviews/reviews.service";
import { assertOwnerOrPermission } from "src/common/utils/permission.utils";
import { PermissionEntry } from "src/common/constants/admin-permissions.constants";
import { ActivityLogService } from "src/activity-log/activity-log.service";
import { EmailService } from "src/common/email-service/email-service";
import { EmailLogService } from "src/email-log/email-log.service";
import { PrismaService } from "src/prisma/prisma.service";
import { FeedRepository } from "src/prisma/repositories/feed.repository";
import { generateObjectId, isObjectIdLike } from "src/common/utils/object-id.util";
import { toGeoJson, toLatLng, withGeoJson } from "src/common/utils/geo.util";
import {
  PRODUCT_INCLUDE,
  buildSearchableTags,
  type ProductApi,
  type ProductType,
} from "./model/product.model";
import { Prisma } from "../../generated/prisma/client";
import { resolvePagination } from "../common/utils/pagination.util";

/** A listing carries a video when the column is non-null and non-empty. */
const HAS_VIDEO: Prisma.ProductWhereInput = { video: { not: null, notIn: [""] } };

@Injectable()
export class ProductsService {
  private readonly logger = new Logger(ProductsService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly feedRepository: FeedRepository,
    @Inject(forwardRef(() => ShopService))
    private readonly shopService: ShopService,
    private readonly listingUtils: ListingUtilsService,
    @Inject(forwardRef(() => UsersService))
    private readonly userService: UsersService,
    private readonly fileUploadService: FileUploadService,
    private promotionService: PromotionService,
    private readonly i18n: I18nService,
    private readonly cls: ClsService,
    @Inject(forwardRef(() => LikeService))
    private readonly likeService: LikeService,
    private readonly shareService: ShareService,
    private readonly reviewService: ReviewService,
    private readonly activityLogService: ActivityLogService,
    private readonly emailService: EmailService,
    private readonly emailLogService: EmailLogService,
  ) {}

  private get lang(): string {
    return this.cls.get("lang") || "en";
  }

  /**
   * Rebuilds the document shape clients expect: `location` as GeoJSON, the
   * shop/owner/category relations back under their old key names, and `_id`.
   */
  private toApiShape<T extends Record<string, any>>(product: T | null): any {
    if (!product) return product;
    const { shop, owner, taggedProduct, ...rest } = product as any;
    const shaped = withGeoJson(rest as any) as any;
    return {
      ...shaped,
      _id: shaped.id,
      // Relations are named `shop`/`owner`; the API fields have always been
      // `shopId`/`ownerId`, carrying either the raw id or the populated row.
      shopId: shop ?? shaped.shopId,
      ownerId: owner ?? shaped.ownerId,
      // Only ever populated on a video post — a plain client without
      // `PRODUCT_INCLUDE` still gets the raw id it wrote/reads directly.
      taggedProductId: taggedProduct ?? shaped.taggedProductId,
    };
  }

  /** Fire-and-forget: creation must succeed even if the email provider is down. */
  private sendListingCreatedEmail(
    name: string,
    email: string,
    title: string,
    productId: string,
    listingCode?: string | null,
  ) {
    const listingUrl = `${process.env.FRONTEND_URL}/buy-product?id=${productId}`;
    const html = `
      <h2>Your listing has been created</h2>
      <p>Hi ${name},</p>
      <p>Your listing "${title}" has been created successfully.</p>
      <p><a href="${listingUrl}">${listingUrl}</a></p>
    `;
    this.emailService
      .sendEmail(email, "Your listing has been created", html)
      .then(() =>
        this.emailLogService.record({
          eventType: "listing_created",
          recipient: email,
          relatedRecordId: listingCode ?? undefined,
          deliveryStatus: "sent",
        }),
      )
      .catch((err) => {
        this.logger.error(`Listing-created email to ${email} failed`, err);
        void this.emailLogService.record({
          eventType: "listing_created",
          recipient: email,
          relatedRecordId: listingCode ?? undefined,
          deliveryStatus: "failed",
        });
      });
  }

  /** Helper: parse + validate GeoJSON Point */
  private parseAndValidateLocation(location: any): {
    type: "Point";
    coordinates: [number, number];
  } {
    let parsed = location;

    if (typeof location === "string") {
      try {
        parsed = JSON.parse(location);
      } catch {
        throw new BadRequestException("Invalid location format (must be valid JSON)");
      }
    }

    if (
      !parsed ||
      parsed.type !== "Point" ||
      !Array.isArray(parsed.coordinates) ||
      parsed.coordinates.length !== 2 ||
      typeof parsed.coordinates[0] !== "number" ||
      typeof parsed.coordinates[1] !== "number"
    ) {
      throw new BadRequestException(
        "location must be a valid GeoJSON Point: { type: 'Point', coordinates: [lng, lat] }",
      );
    }

    return {
      type: "Point",
      coordinates: [parsed.coordinates[0], parsed.coordinates[1]],
    };
  }

  /** Atomically reserves the next sequential listing code (e.g. LST-000052). */
  private async generateNextListingCode(): Promise<string> {
    const counter = await this.prisma.counter.upsert({
      where: { id: "listingCode" },
      create: { id: "listingCode", seq: 1 },
      update: { seq: { increment: 1 } },
    });
    return `LST-${String(counter.seq).padStart(6, "0")}`;
  }

  /** Atomically reserves the next sequential video code (e.g. VID-000001), for products that have a video (feed videos). */
  private async generateNextVideoCode(): Promise<string> {
    const counter = await this.prisma.counter.upsert({
      where: { id: "videoCode" },
      create: { id: "videoCode", seq: 1 },
      update: { seq: { increment: 1 } },
    });
    return `VID-${String(counter.seq).padStart(6, "0")}`;
  }

  /**
   * A shop is opened under one category and what it sells has to stay inside
   * it: an Electronics shop lists electronics, not furniture.
   *
   * The app's category picker only offers the shop's own category, so this is
   * the same rule stated on the server — for direct API calls, for the older
   * app builds still sending a free choice, and for the admin panel.
   *
   * A shop also carries an optional subcategory; both count as inside the shop.
   */
  private async assertCategoryAllowedForShop(shopId: string, categoryId: string) {
    const shop = await this.prisma.shop.findUnique({
      where: { id: shopId },
      select: { categoryId: true, subcategoryId: true },
    });
    if (!shop) return;

    const allowed = [shop.categoryId, shop.subcategoryId].filter(
      (id): id is string => !!id,
    );
    if (allowed.includes(categoryId)) return;

    const shopCategory = await this.prisma.category.findUnique({
      where: { id: shop.categoryId },
      select: { type: true, name: true, groupedCategoryIds: true },
    });

    // A shop-type category groups several product categories (e.g. "Vehicle"
    // -> Car, Bike) — the listing's category must be one of them. A shop
    // still filed directly under a plain product category (the pre-grouping
    // shape) is already covered by the exact-match check above and enforces
    // nothing further here. Anything else (category missing/disabled) stays
    // unenforced, same as before.
    if (shopCategory?.type === "shop") {
      if ((shopCategory.groupedCategoryIds ?? []).includes(categoryId)) return;
    } else if (shopCategory?.type !== "product") {
      return;
    }

    const names = (shopCategory?.name ?? {}) as Record<string, string>;
    throw new BadRequestException(
      this.i18n.translate("auth.products.category_not_in_shop", {
        lang: this.lang,
        args: { category: names[this.lang] ?? names.en ?? "" },
      }),
    );
  }

  /**
   * Resolves an optional "tag a product" id (used on a video post) to a real,
   * same-owner listing — or to nothing at all. Every failure mode (doesn't
   * exist, belongs to someone else, is itself a video post) resolves to
   * `null` rather than throwing: a stale or malformed tag shouldn't block the
   * post the seller is actually trying to make, since this is entirely
   * optional to begin with.
   */
  private async resolveTaggedProductId(
    candidateId: string,
    type: "shop" | "personal",
    shopId: string | null,
    ownerId: string | null,
  ): Promise<string | null> {
    const candidate = await this.prisma.product.findFirst({
      where: { id: candidateId, isDeleted: false, isDisabled: false, isVideoPost: false },
      select: { id: true, shopId: true, ownerId: true },
    });
    if (!candidate) return null;

    const sameOwner =
      type === "shop" ? candidate.shopId === shopId : candidate.ownerId === ownerId;
    return sameOwner ? candidate.id : null;
  }

  async create(
    entityId: string,
    type: "shop" | "personal",
    dto: CreateProductDto,
  ): Promise<{ message: string; data: { product: ProductApi } }> {
    try {
      let location: { type: "Point"; coordinates: [number, number] };
      let ownerName = "";
      let ownerEmail = "";
      let shopId: string | null = null;
      let ownerId: string | null = null;
      let address: string | null = null;

      // Lightweight "just a video" post: skip the category/price the owner
      // would otherwise have to pick — categoryId stays null rather than
      // standing in for a real choice.
      const isVideoPost = !!dto.isVideoPost;
      const categoryId = isVideoPost ? null : dto.category;

      // categoryId is only required for a real listing. Mongoose enforced
      // this with `required: true`; with no global ValidationPipe the DTO
      // alone does not, so a missing category must be rejected explicitly
      // rather than reaching Postgres as an unintended null.
      if (!isVideoPost && !categoryId) {
        throw new BadRequestException(
          this.i18n.translate("auth.products.category_required", { lang: this.lang }) ||
            "A category is required",
        );
      }

      if (type === "shop") {
        const shop = await this.shopService.getShopById(entityId);
        if (!shop) {
          throw new NotFoundException(
            this.i18n.translate("auth.products.shop_not_found", { lang: this.lang }),
          );
        }

        ownerName = (shop.ownerId as any)?.name ?? "";
        ownerEmail = (shop.ownerId as any)?.email ?? "";

        if (
          !shop.location ||
          !shop.location.coordinates ||
          shop.location.coordinates.length !== 2
        ) {
          throw new BadRequestException(
            this.i18n.translate("auth.products.shop_location_missing", {
              lang: this.lang,
            }),
          );
        }

        shopId = shop.id;
        location = shop.location;

        // A video post has no category at all, so the shop's category
        // restriction doesn't apply to it. categoryId is validated non-empty
        // above whenever !isVideoPost, so this cast is safe.
        if (!isVideoPost) {
          await this.assertCategoryAllowedForShop(shop.id, categoryId as string);
        }
      } else if (type === "personal") {
        const user = await this.userService.findUserById(entityId);
        if (!user) {
          throw new NotFoundException(
            this.i18n.translate("auth.products.user_not_found", { lang: this.lang }),
          );
        }

        ownerId = user.id;
        ownerName = user.name;
        ownerEmail = user.email;

        // Location is required for personal listings
        if (!dto.location) {
          throw new BadRequestException(
            this.i18n.translate("auth.products.location_required_for_personal", {
              lang: this.lang,
            }) || "Location coordinates are required for personal listings",
          );
        }

        // Parse + validate (handles both string and object)
        location = this.parseAndValidateLocation(dto.location);

        // Address is optional but recommended
        if (dto.address) {
          address = dto.address.trim();
        }
      } else {
        throw new BadRequestException('Invalid type. Must be "shop" or "personal".');
      }

      // Optional, and only meaningful on a video post: which of the SAME
      // shop's/owner's own real listings this clip is promoting. Silently
      // ignored rather than rejected outright if it doesn't resolve to one —
      // a stale or since-deleted id shouldn't block the whole post going up.
      const taggedProductId = dto.taggedProductId
        ? await this.resolveTaggedProductId(dto.taggedProductId, type, shopId, ownerId)
        : null;

      const listingCode = await this.generateNextListingCode();
      const productId = generateObjectId();
      const { latitude, longitude } = toLatLng(location);
      const parameters = Array.isArray(dto.parameters) ? dto.parameters : [];

      let images: string[] = [];
      if (dto?.images?.length) {
        const uploadedFiles = await this.fileUploadService.uploadProductFiles(
          dto.images,
          type,
          entityId,
          productId,
          "images",
        );
        images = uploadedFiles.map((file) => file.url);
      }

      let video: string | null = null;
      let videoCode: string | null = null;
      if (dto?.video) {
        const uploadedVideo = await this.fileUploadService.uploadProductFiles(
          [dto.video],
          type,
          entityId,
          productId,
          "video",
        );
        video = uploadedVideo[0].url;
        videoCode = await this.generateNextVideoCode();
      }

      const result = await this.prisma.product.create({
        data: {
          id: productId,
          listingCode,
          videoCode,
          shopId,
          ownerId,
          title: dto.title,
          description: dto.description ?? null,
          // Price is optional on every listing, not just video posts: a classified
          // or "contact for price" item has none. Absent means 0, which the feed
          // and detail cards already render as "no price shown" rather than "Rs 0".
          // Without the ?? the missing value became NaN and Postgres rejected the row.
          price: Math.round(Number(dto.price ?? 0)),
          categoryId,
          type: (isVideoPost ? dto.type || "retail" : dto.type) as ProductType,
          images,
          video,
          latitude,
          longitude,
          parameters: parameters as unknown as Prisma.InputJsonValue,
          // Was rebuilt by two Mongoose pre-hooks; computed explicitly now.
          searchableTags: buildSearchableTags(parameters),
          isVideoPost,
          address,
          // Only a private listing carries these; a shop's products are found
          // through the shop, which holds its own city and area.
          city: dto.city?.trim() || null,
          area: dto.area?.trim() || null,
          taggedProductId,
        },
      });

      // A video post isn't a real listing — don't send the "listing created" email for it.
      if (ownerEmail && !isVideoPost) {
        this.sendListingCreatedEmail(
          ownerName,
          ownerEmail,
          result.title,
          result.id,
          result.listingCode,
        );
      }

      return {
        message: this.i18n.translate("auth.products.created_success", { lang: this.lang }),
        data: { product: this.toApiShape(result) },
      };
    } catch (err) {
      // re-throw known Nest exceptions, wrap the rest
      if (
        err instanceof NotFoundException ||
        err instanceof BadRequestException ||
        err instanceof ForbiddenException
      ) {
        throw err;
      }
      throw new InternalServerErrorException(err);
    }
  }

  async getAllProductsByShop(
    shopId: string,
    paginationDto: PaginationDto,
  ): Promise<PaginatedResponseDto<ProductApi>> {
    const { page: rawPage, limit: rawLimit } = paginationDto;
    const { page, limit, skip } = resolvePagination(rawPage, rawLimit);

    // Video posts are a separate flow from real listings (no category/price of
    // their own) — they belong only in getVideoPostsByShop, not mixed in here.
    const where: Prisma.ProductWhereInput = {
      shopId,
      isVideoPost: false,
      isDeleted: false,
      isDisabled: false,
    };

    const [items, total] = await Promise.all([
      this.prisma.product.findMany({
        where,
        include: { category: true, shop: true },
        orderBy: { createdAt: "desc" },
        skip,
        take: limit,
      }),
      this.prisma.product.count({ where }),
    ]);

    return {
      meta: { total, page, limit, totalPages: Math.ceil(total / limit) },
      data: items.map((p) => this.toApiShape(p)),
    };
  }

  /** A shop's own posted videos — both lightweight video posts and any real
   *  listing that happens to carry a video. Delete behaves differently per item
   *  (see `deleteVideoEntry`): a video post is removed entirely, a real listing
   *  just loses its video and stays listed. */
  async getVideoPostsByShop(
    shopId: string,
    paginationDto: PaginationDto,
  ): Promise<PaginatedResponseDto<ProductApi>> {
    const { page: rawPage, limit: rawLimit } = paginationDto;
    const { page, limit, skip } = resolvePagination(rawPage, rawLimit);

    const where: Prisma.ProductWhereInput = {
      shopId,
      ...HAS_VIDEO,
      isDeleted: false,
      isDisabled: false,
    };

    const [items, total] = await Promise.all([
      this.prisma.product.findMany({
        where,
        orderBy: { createdAt: "desc" },
        skip,
        take: limit,
      }),
      this.prisma.product.count({ where }),
    ]);

    return {
      meta: { total, page, limit, totalPages: Math.ceil(total / limit) },
      data: items.map((p) => this.toApiShape(p)),
    };
  }

  async getAllProductsByUser(
    ownerId: string,
    paginationDto: PaginationDto,
  ): Promise<PaginatedResponseDto<ProductApi>> {
    const { page: rawPage, limit: rawLimit } = paginationDto;
    const { page, limit, skip } = resolvePagination(rawPage, rawLimit);

    const where: Prisma.ProductWhereInput = {
      ownerId,
      isDeleted: false,
      isDisabled: false,
    };

    const [items, total] = await Promise.all([
      this.prisma.product.findMany({
        where,
        include: { category: true, owner: true },
        orderBy: { createdAt: "desc" },
        skip,
        take: limit,
      }),
      // The old count used a *different* filter — it passed the raw ownerId
      // string where the find used an ObjectId — so the two could disagree.
      // One `where` is now shared by both.
      this.prisma.product.count({ where }),
    ]);

    return {
      meta: { total, page, limit, totalPages: Math.ceil(total / limit) },
      data: items.map((p) => this.toApiShape(p)),
    };
  }

  async getById(id: string, userId?: string): Promise<any> {
    const product = await this.prisma.product.findFirst({
      where: { id, isDeleted: false, isDisabled: false },
      include: PRODUCT_INCLUDE,
    });

    if (!product)
      throw new NotFoundException(
        this.i18n.translate("auth.products.product_not_found", { lang: this.lang }),
      );

    const [listingAnalytics, likesCount] = await Promise.all([
      this.getListingAnalytics(id),
      this.likeService.getLikeCount(id, "product"),
    ]);

    const shaped = this.toApiShape(product);

    // If there's no logged-in user, return product as-is (still with real analytics)
    if (!userId) return { ...shaped, ...listingAnalytics, likesCount };

    // Otherwise include whether the user liked / reviewed this product
    const [isLiked, userReview] = await Promise.all([
      this.likeService.isLiked(userId, id, "product"),
      this.reviewService.findOne(userId, id, "product"),
    ]);

    return {
      ...shaped,
      ...listingAnalytics,
      likesCount,
      isLiked: !!isLiked,
      isReviewed: userReview || null,
    };
  }

  /** Resolves the User who actually owns this listing — the Shop's owner if it belongs to a
   *  shop, otherwise the product's own `ownerId` (personal/individual listing). Mirrors the
   *  identical shop-vs-personal resolution already used by update()/delete() for permissions. */
  async resolveProductOwnerId(product: {
    shopId?: unknown;
    ownerId?: unknown;
  }): Promise<string | undefined> {
    // Accepts both a Prisma row (string ids) and a Mongoose document
    // (ObjectIds), because ProductOfferService still passes the latter until it
    // is converted.
    const shopId = product.shopId ? String(product.shopId) : null;
    const ownerId = product.ownerId ? String(product.ownerId) : null;

    return shopId
      ? ((await this.shopService.getShopOwnerId(shopId)) ?? undefined)
      : (ownerId ?? undefined);
  }

  /** Real-value counterpart to the admin Listing detail modal's "Listing Analytics" tiles —
   *  Total Views / Unique Visitors both read off the same day-deduped ProductView table
   *  (Total Views = row count, Unique Visitors = distinct userId count), Contact/WhatsApp
   *  Clicks read off their own lifetime-deduped tables. No raw counters anywhere. */
  private async getListingAnalytics(productId: string) {
    const [totalViews, uniqueVisitors, contactClicks, whatsappClicks] = await Promise.all([
      this.prisma.productView.count({ where: { productId } }),
      // Was .distinct("userId"); a grouped count says the same thing without
      // pulling every id into memory.
      this.prisma.productView.findMany({
        where: { productId },
        distinct: ["userId"],
        select: { userId: true },
      }),
      this.prisma.productContactClick.count({ where: { productId } }),
      this.prisma.productWhatsappClick.count({ where: { productId } }),
    ]);

    return {
      totalViews,
      uniqueVisitorsCount: uniqueVisitors.length,
      contactClicks,
      whatsappClicks,
    };
  }

  /**
   * Admin: paginated list of the distinct users who viewed one product, most
   * recent view first — powers the "who viewed this" drill-down on the admin
   * Feed page. ProductView is day-deduped, so this groups by user first.
   */
  async getViewersForProduct(
    productId: string,
    page = 1,
    limit = 20,
  ): Promise<{
    data: unknown[];
    meta: { total: number; page: number; limit: number; totalPages: number };
  }> {
    const pageNum = Number(page) || 1;
    const limitNum = Number(limit) || 20;
    const skip = (pageNum - 1) * limitNum;

    const [groups, distinctCount] = await Promise.all([
      this.prisma.productView.groupBy({
        by: ["userId"],
        where: { productId },
        _max: { createdAt: true },
        orderBy: { _max: { createdAt: "desc" } },
        skip,
        take: limitNum,
      }),
      this.prisma.$queryRaw<{ count: bigint }[]>`
        SELECT count(DISTINCT user_id) AS count
        FROM product_views
        WHERE product_id = ${productId}
      `,
    ]);

    const users = await this.prisma.user.findMany({
      where: { id: { in: groups.map((g) => g.userId) } },
      select: { id: true, name: true, email: true, image: true },
    });
    const usersById = new Map(users.map((u) => [u.id, u]));

    // Same output shape as the old $project: { createdAt, user }.
    const data = groups.map((g) => ({
      createdAt: g._max.createdAt,
      user: usersById.get(g.userId)
        ? { ...usersById.get(g.userId), _id: g.userId }
        : null,
    }));

    const total = Number(distinctCount[0]?.count ?? 0);

    return {
      data,
      meta: { total, page: pageNum, limit: limitNum, totalPages: Math.ceil(total / limitNum) },
    };
  }

  /**
   * The three tracking calls below were byte-identical apart from the table.
   * Each skips the listing's own owner, and each dedupes so a count of rows is
   * the metric — views per (product, user, day), clicks per (product, user).
   */
  private async trackProductEngagement(
    kind: "view" | "contactClick" | "whatsappClick",
    productId: string,
    userId: string,
  ): Promise<void> {
    if (!isObjectIdLike(productId) || !isObjectIdLike(userId)) return;

    const product = await this.prisma.product.findUnique({
      where: { id: productId },
      select: { shopId: true, ownerId: true },
    });
    if (!product) return;

    const ownerId = await this.resolveProductOwnerId(product);
    if (!ownerId || ownerId === userId) return;

    if (kind === "view") {
      const day = new Date().toISOString().slice(0, 10);
      await this.prisma.productView.upsert({
        where: { productId_userId_day: { productId, userId, day } },
        create: { id: generateObjectId(), productId, userId, day },
        update: {},
      });
      return;
    }

    const where = { productId_userId: { productId, userId } };
    const create = { id: generateObjectId(), productId, userId };

    if (kind === "contactClick") {
      await this.prisma.productContactClick.upsert({ where, create, update: {} });
    } else {
      await this.prisma.productWhatsappClick.upsert({ where, create, update: {} });
    }
  }

  /** Records a listing view: day-deduped per (product, user) — a page refresh within the same
   *  day never recounts, but a return visit on a later day does. Skips the listing's own owner. */
  async trackView(productId: string, userId: string): Promise<void> {
    return this.trackProductEngagement("view", productId, userId);
  }

  /** Records a "Chat / Message Seller" click on a listing. Deduped per (product, user) forever. */
  async trackContactClick(productId: string, userId: string): Promise<void> {
    return this.trackProductEngagement("contactClick", productId, userId);
  }

  /** Records a "WhatsApp" click on a listing. Deduped per (product, user) forever. */
  async trackWhatsappClick(productId: string, userId: string): Promise<void> {
    return this.trackProductEngagement("whatsappClick", productId, userId);
  }

  async update(
    productId: string,
    updateDto: UpdateProductDto,
    currentUser?: { sub: string; roles?: string[]; permissions?: PermissionEntry[] },
  ): Promise<any> {
    if ("shopId" in updateDto) {
      throw new ForbiddenException(
        this.i18n.translate("auth.products.shop_cant_update", { lang: this.lang }),
      );
    }

    // Remove empty / null / undefined fields
    const dto: Record<string, any> = { ...updateDto };
    Object.keys(dto).forEach((key) => {
      if (dto[key] === "" || dto[key] === null || typeof dto[key] === "undefined") {
        delete dto[key];
      }
    });

    const existingProduct = await this.prisma.product.findFirst({
      where: { id: productId, isDeleted: false, isDisabled: false },
    });

    if (!existingProduct) {
      throw new NotFoundException(
        this.i18n.translate("auth.products.product_not_found", { lang: this.lang }),
      );
    }

    if (currentUser) {
      const resolvedOwnerId = await this.resolveProductOwnerId(existingProduct);
      assertOwnerOrPermission(currentUser, resolvedOwnerId ?? "", "listings", "edit");
    }

    const entityId = existingProduct.shopId ?? existingProduct.ownerId!;
    const data: Prisma.ProductUpdateInput = {};

    if (dto.title !== undefined) data.title = dto.title;
    if (dto.description !== undefined) data.description = dto.description;
    if (dto.price !== undefined) data.price = Math.round(Number(dto.price));
    if (dto.type !== undefined) data.type = dto.type as ProductType;
    if (dto.address !== undefined) data.address = dto.address;
    if (dto.city !== undefined) data.city = dto.city.trim() || null;
    if (dto.area !== undefined) data.area = dto.area.trim() || null;
    if (dto.category) {
      // Editing a shop's listing can't move it out of the shop's category
      // either, or the create-time rule would be one save away from undone.
      // Resending the category it already has is not a move, and stays
      // allowed — listings that predate this rule are still editable.
      if (
        existingProduct.shopId &&
        !existingProduct.isVideoPost &&
        dto.category !== existingProduct.categoryId
      ) {
        await this.assertCategoryAllowedForShop(
          existingProduct.shopId,
          dto.category,
        );
      }
      data.category = { connect: { id: dto.category } };
    }

    if (dto.location) {
      const { latitude, longitude } = toLatLng(
        this.parseAndValidateLocation(dto.location),
      );
      data.latitude = latitude;
      data.longitude = longitude;
    }

    if (dto.images && dto.images.length > 0) {
      const uploadedFiles = await this.fileUploadService.uploadProductFiles(
        dto.images,
        "shop",
        entityId,
        productId,
        "images",
      );
      const newImages = uploadedFiles.map((file) => file.url);
      data.images = [...(existingProduct.images || []), ...newImages];
    }

    if (dto.video) {
      const uploadedVideo = await this.fileUploadService.uploadProductFiles(
        [dto.video],
        "shop",
        entityId,
        productId,
        "video",
      );
      data.video = uploadedVideo[0].url;
      if (!existingProduct.videoCode) {
        data.videoCode = await this.generateNextVideoCode();
      }
    }

    // Also update searchableTags if parameters changed. This was one of the two
    // Mongoose pre-hooks; it is explicit now.
    if (dto.parameters) {
      data.parameters = dto.parameters as unknown as Prisma.InputJsonValue;
      data.searchableTags = buildSearchableTags(dto.parameters);
    }

    const updated = await this.prisma.product.update({
      where: { id: productId },
      data,
    });

    return {
      message: this.i18n.translate("auth.products.updated_success", { lang: this.lang }),
      data: { product: this.toApiShape(updated) },
    };
  }

  async delete(
    productId: string,
    currentUser?: { sub: string; roles?: string[]; permissions?: PermissionEntry[] },
    lang: string = "en",
    ipAddress?: string,
    // When provided, enforces that /products/:id can't delete a video post and
    // /video-posts/:id can't delete a real listing — the two flows stay separate
    // even though they share the same underlying row type.
    expectedIsVideoPost?: boolean,
  ) {
    const existingProduct = await this.prisma.product.findFirst({
      where: { id: productId, isDeleted: false, isDisabled: false },
    });
    if (!existingProduct) {
      throw new NotFoundException(
        this.i18n.translate("auth.products.product_not_found", { lang: this.lang }),
      );
    }
    if (
      expectedIsVideoPost !== undefined &&
      !!existingProduct.isVideoPost !== expectedIsVideoPost
    ) {
      throw new NotFoundException(
        this.i18n.translate("auth.products.product_not_found", { lang: this.lang }),
      );
    }
    const type = existingProduct.shopId ? "shop" : "personal";
    const entityId = existingProduct.shopId ?? existingProduct.ownerId!;

    let resolvedOwnerId: string | undefined;
    if (currentUser) {
      resolvedOwnerId = await this.resolveProductOwnerId(existingProduct);
      assertOwnerOrPermission(currentUser, resolvedOwnerId ?? "", "listings", "delete");
    }

    await this.fileUploadService.deleteEntityProducts(type, entityId, productId);

    await this.prisma.product.update({
      where: { id: productId },
      data: { isDeleted: true, images: [], video: "" },
    });

    if (currentUser && resolvedOwnerId && resolvedOwnerId !== currentUser.sub) {
      await this.activityLogService.record(
        currentUser,
        "listing_deleted",
        "Product",
        productId,
        existingProduct.title,
        ipAddress,
      );
    }

    return this.toApiShape(existingProduct);
  }

  async deleteProductMedia(
    productId: string,
    media: string[],
    currentUser?: { sub: string; roles?: string[]; permissions?: PermissionEntry[] },
  ) {
    const existingProduct = await this.prisma.product.findFirst({
      where: { id: productId, isDeleted: false, isDisabled: false },
    });
    if (!existingProduct) {
      throw new NotFoundException(
        this.i18n.translate("auth.products.product_not_found", { lang: this.lang }),
      );
    }
    if (!media || media.length === 0) {
      throw new BadRequestException(
        this.i18n.translate("auth.products.no_media_provided", { lang: this.lang }),
      );
    }

    if (currentUser) {
      const resolvedOwnerId = await this.resolveProductOwnerId(existingProduct);
      assertOwnerOrPermission(currentUser, resolvedOwnerId ?? "", "listings", "edit");
    }

    // Remove media files from storage
    await this.fileUploadService.deleteFiles(media);

    // Remove media from the row
    const images = (existingProduct.images || []).filter(
      (imgUrl) => !media.includes(imgUrl),
    );
    const video =
      existingProduct.video && media.includes(existingProduct.video)
        ? ""
        : existingProduct.video;

    await this.prisma.product.update({
      where: { id: productId },
      data: { images, video },
    });

    return true;
  }

  /** Delete action for one row in "My Videos", which mixes video posts and real
   *  listings that carry a video. A video post only exists for its video, so
   *  removing it deletes the whole entry; a real listing should stay listed
   *  (title/price/category/images intact) with just its video removed. */
  async deleteVideoEntry(
    productId: string,
    currentUser?: { sub: string; roles?: string[]; permissions?: PermissionEntry[] },
    ipAddress?: string,
  ) {
    const existingProduct = await this.prisma.product.findFirst({
      where: { id: productId, isDeleted: false, isDisabled: false },
    });
    if (!existingProduct || !existingProduct.video) {
      throw new NotFoundException(
        this.i18n.translate("auth.products.product_not_found", { lang: this.lang }),
      );
    }

    if (existingProduct.isVideoPost) {
      await this.delete(productId, currentUser, undefined, ipAddress, true);
      return { deletedListing: true };
    }

    await this.deleteProductMedia(productId, [existingProduct.video], currentUser);
    return { deletedListing: false };
  }

  async searchNearbyWithCategory(
    category: string,
    coordinates: [number, number],
    radius: number,
    pagination: PaginationDto,
  ) {
    return this.listingUtils.findNearbyWithCategory(
      "products",
      category,
      coordinates,
      radius,
      pagination,
    );
  }

  /**
   * Every offer placed on one listing, for the admin Listings screen.
   *
   * The seller-facing offer endpoints are scoped to the signed-in user; this
   * one is not, because the caller is an admin holding the "listings"
   * permission.
   */
  async getProductOffersForAdmin(productId: string) {
    if (!isObjectIdLike(productId)) {
      throw new BadRequestException("Invalid product id");
    }

    const product = await this.prisma.product.findUnique({
      where: { id: productId },
      select: { id: true, title: true, listingCode: true, price: true },
    });
    if (!product) {
      throw new NotFoundException("Product not found");
    }

    const offers = await this.prisma.productOffer.findMany({
      where: { productId },
      include: {
        offerer: { select: { id: true, name: true, email: true, image: true, phone: true } },
      },
      orderBy: { createdAt: "desc" },
    });

    const data = offers.map((o) => ({
      _id: o.id,
      id: o.id,
      price: o.price,
      message: o.message,
      status: o.status,
      createdAt: o.createdAt,
      respondedAt: o.respondedAt,
      offerer: o.offerer
        ? { _id: o.offerer.id, ...o.offerer }
        : { _id: o.offererId, id: o.offererId, name: null, email: null, image: null, phone: null },
    }));

    const byStatus = data.reduce<Record<string, number>>((acc, o) => {
      acc[o.status] = (acc[o.status] ?? 0) + 1;
      return acc;
    }, {});

    // A buyer may offer more than once on the same listing, so "how many users
    // offered" is a count of distinct offerers, not of rows.
    const distinctOfferers = new Set(data.map((o) => o.offerer.id)).size;

    return {
      data,
      meta: {
        total: data.length,
        offererCount: distinctOfferers,
        product: {
          _id: product.id,
          id: product.id,
          title: product.title,
          listingCode: product.listingCode,
          price: product.price,
        },
        pending: byStatus.pending ?? 0,
        accepted: byStatus.accepted ?? 0,
        declined: byStatus.declined ?? 0,
        expired: byStatus.expired ?? 0,
      },
    };
  }

  async getAllForAdmin(
    paginationDto: PaginationDto,
    search?: string,
  ): Promise<PaginatedResponseDto<ProductApi>> {
    const { page: rawPage, limit: rawLimit } = paginationDto;
    const { page, limit, skip } = resolvePagination(rawPage, rawLimit);

    const where: Prisma.ProductWhereInput = {};

    if (search && search.trim()) {
      const term = search.trim();
      where.OR = [
        { title: { contains: term, mode: "insensitive" } },
        { description: { contains: term, mode: "insensitive" } },
        // `category.name` is JSONB; the old dotted paths "category.name.en"
        // never matched anything, because $regex on a joined field does not work
        // that way in a plain find(). A relation filter on the JSON path does.
        { category: { name: { path: ["en"], string_contains: term } } },
        { category: { name: { path: ["ur"], string_contains: term } } },
      ];
    }

    const [items, total] = await Promise.all([
      this.prisma.product.findMany({
        where,
        include: {
          category: true,
          shop: true,
          owner: true,
          // One aggregate on the join rather than a query per row.
          _count: { select: { offers: true } },
        },
        orderBy: { createdAt: "desc" },
        skip,
        take: limit,
      }),
      this.prisma.product.count({ where }),
    ]);

    return {
      meta: { total, page, limit, totalPages: Math.ceil(total / limit) },
      data: items.map(({ _count, ...p }) => ({
        ...this.toApiShape(p),
        offerCount: _count?.offers ?? 0,
      })),
    };
  }

  async updateStatus(productId: string, isDisabled: boolean) {
    const existing = await this.prisma.product.findUnique({ where: { id: productId } });
    if (!existing) {
      throw new NotFoundException(
        this.i18n.translate("auth.products.product_not_found", { lang: this.lang }),
      );
    }

    const updated = await this.prisma.product.update({
      where: { id: productId },
      data: { isDisabled },
    });

    return {
      message: isDisabled
        ? this.i18n.translate("auth.products.product_disabled_success", { lang: this.lang })
        : this.i18n.translate("auth.products.product_enabled_success", { lang: this.lang }),
      data: this.toApiShape(updated),
    };
  }

  async findNearbyProductShopOwnerIds(
    categoryId: string,
    coordinates: [number, number],
    radiusInMeters: number,
  ): Promise<string[]> {
    const [longitude, latitude] = coordinates;
    return this.feedRepository.findNearbyListingOwnerIds({
      table: "products",
      categoryId,
      longitude,
      latitude,
      radiusMeters: radiusInMeters,
    });
  }

  async updateLocationByShopId(
    shopId: string,
    location: { type: "Point"; coordinates: [number, number] },
  ) {
    const { latitude, longitude } = toLatLng(location);
    await this.prisma.product.updateMany({
      where: { shopId },
      data: { latitude, longitude },
    });
  }

  async setDisabledByShop(shopId: string, disabled: boolean) {
    await this.prisma.product.updateMany({
      where: { shopId },
      data: { isDisabled: disabled },
    });
  }

  async setProductsDisabledByShopsBulk(shopIds: any[], disabled: boolean) {
    await this.prisma.product.updateMany({
      where: { shopId: { in: shopIds.map((id) => String(id)) } },
      data: { isDisabled: disabled },
    });
  }

  async setProductsDisabledByUser(userId: string, disabled: boolean) {
    await this.prisma.product.updateMany({
      where: { ownerId: userId },
      data: { isDisabled: disabled },
    });
  }

  async searchProducts(query: SearchAllProductsServiceDto) {
    const page = Math.max(1, query.page || 1);
    const limit = Math.max(1, query.limit || 10);
    const skip = (page - 1) * limit;

    const allPromotedIds = await this.promotionService.getActivePromotionProductIds();

    const baseFilter: Prisma.ProductWhereInput = {
      isDeleted: false,
      isDisabled: false,
      // Video posts aren't real listings — keep them out of buyer-facing search.
      isVideoPost: false,
    };

    if (query.category) {
      baseFilter.categoryId = query.category;
    }

    if (query.startDate || query.endDate) {
      const createdAt: Prisma.DateTimeFilter = {};
      if (query.startDate) createdAt.gte = new Date(query.startDate);
      if (query.endDate) {
        const endOfDay = new Date(query.endDate);
        endOfDay.setHours(23, 59, 59, 999);
        createdAt.lte = endOfDay;
      }
      baseFilter.createdAt = createdAt;
    }

    const searchTerm = query.name?.trim();

    // === Promoted Products ===
    const promotedProducts =
      allPromotedIds.length === 0
        ? []
        : await this.prisma.product.findMany({
            where: { id: { in: allPromotedIds }, ...baseFilter },
            orderBy: { createdAt: "desc" },
          });

    const promotedProductIds = promotedProducts.map((p) => p.id);

    // === Regular Products ===
    const regularFilter: Prisma.ProductWhereInput = {
      ...baseFilter,
      ...(promotedProductIds.length > 0
        ? { id: { notIn: promotedProductIds } }
        : {}),
    };

    if (searchTerm) {
      regularFilter.OR = [
        { title: { contains: searchTerm, mode: "insensitive" } },
        { description: { contains: searchTerm, mode: "insensitive" } },
        // `parameters` is JSONB and is not searched directly; searchableTags is
        // the denormalised, GIN-indexed projection of exactly those values.
        { searchableTags: { has: searchTerm } },
        { listingCode: { contains: searchTerm, mode: "insensitive" } },
      ];
    }

    const [regularProducts, total] = await Promise.all([
      this.prisma.product.findMany({
        where: regularFilter,
        include: { category: true },
        orderBy: { createdAt: "desc" },
        skip,
        take: limit,
      }),
      this.prisma.product.count({ where: regularFilter }),
    ]);

    const [enrichedPromotions, enrichedRegularProducts] = await Promise.all([
      this.enrichProductsWithReviewStats(promotedProducts.map((p) => this.toApiShape(p))),
      this.enrichProductsWithReviewStats(regularProducts.map((p) => this.toApiShape(p))),
    ]);

    return {
      data: {
        promotions: enrichedPromotions,
        items: enrichedRegularProducts,
      },
      meta: { total, page, limit, totalPages: Math.ceil(total / limit) },
    };
  }

  private async enrichProductsWithReviewStats(products: any[]) {
    if (!products || products.length === 0) {
      return products;
    }

    const productIds = products.map((product) => String(product.id ?? product._id));
    const reviewStats = await this.reviewService.getAverageRatingsForItems(
      productIds,
      "product",
    );

    const reviewMap = new Map(
      reviewStats.map((item) => [
        item._id,
        { avgRating: item.avgRating ?? 0, reviewCount: item.count ?? 0 },
      ]),
    );

    return products.map((product: any) => {
      const stats = reviewMap.get(String(product.id ?? product._id));
      return {
        ...product,
        averageRating: stats?.avgRating ? Number(stats.avgRating.toFixed(1)) : 0,
        reviewCount: stats?.reviewCount ?? 0,
      };
    });
  }

  async getProductsWithVideos(
    paginationDto: PaginationDto & { search?: string },
    userId?: string,
    category?: string,
  ): Promise<PaginatedResponseDto<any>> {
    const { page: rawPage, limit: rawLimit, search } = paginationDto;
    const { page, limit, skip } = resolvePagination(rawPage, rawLimit);

    const where: Prisma.ProductWhereInput = {
      ...HAS_VIDEO,
      isDeleted: false,
      isDisabled: false,
    };
    if (category) {
      where.categoryId = category;
    }
    if (search?.trim()) {
      where.title = { contains: search.trim(), mode: "insensitive" };
    }

    const [items, total] = await Promise.all([
      this.prisma.product.findMany({
        where,
        include: {
          category: true,
          shop: {
            select: {
              id: true,
              title: true,
              image: true,
              address: true,
              description: true,
              ownerId: true,
              banner: true,
            },
          },
          owner: {
            select: { id: true, name: true, image: true, address: true, phone: true },
          },
          // Only meaningful on a video post — the real listing it optionally
          // promotes, so the feed card can show that listing's own price and
          // link to it instead of the video post's own nominal price/no price.
          taggedProduct: { select: { id: true, title: true, images: true, price: true } },
        },
        orderBy: { createdAt: "desc" },
        skip,
        take: limit,
      }),
      this.prisma.product.count({ where }),
    ]);

    const shaped = items.map((p) => this.toApiShape(p));
    const itemIds = shaped.map((item) => item.id as string);
    const [likeCounts, shareCounts] = await Promise.all([
      this.likeService.getLikeCountsForItems(itemIds, "product"),
      this.shareService.getShareCountsForItems(itemIds, "product"),
    ]);

    if (!userId) {
      return {
        meta: { total, page, limit, totalPages: Math.ceil(total / limit) },
        data: shaped.map((item) => ({
          ...item,
          likesCount: likeCounts.get(item.id) ?? 0,
          sharesCount: shareCounts.get(item.id) ?? 0,
        })),
      };
    }

    const user = await this.userService.findUserById(userId);
    if (!user) {
      throw new NotFoundException(
        this.i18n.translate("auth.users.user_not_found", { lang: this.lang }),
      );
    }

    const likedProductIds = await this.likeService.getLikedItemIds(
      userId,
      "product",
      itemIds,
    );

    const data = shaped.map((item) => ({
      ...item,
      isLiked: likedProductIds.has(item.id),
      likesCount: likeCounts.get(item.id) ?? 0,
      sharesCount: shareCounts.get(item.id) ?? 0,
    }));

    return {
      meta: { total, page, limit, totalPages: Math.ceil(total / limit) },
      data,
    };
  }

  /**
   * Admin-only: the unified Feed — every video across Products (shop-owned or individual)
   * AND Services, including suspended ones, in one sorted/paginated list. The $unionWith
   * pipeline is now a SQL UNION ALL; see FeedRepository. Each row is tagged with itemType
   * ("shop" | "product" | "service") and the resolved uploader: a shop's product resolves
   * to the shop owner, an individual product/service resolves to its direct ownerId.
   */
  async getProductsWithVideosForAdmin(
    page = 1,
    limit = 10,
    search?: string,
    startDate?: string,
    endDate?: string,
  ): Promise<PaginatedResponseDto<any>> {
    const pageNum = Number(page) || 1;
    const limitNum = Number(limit) || 10;
    const skip = (pageNum - 1) * limitNum;

    const { rows, total } = await this.feedRepository.findForAdmin({
      skip,
      take: limitNum,
      search,
      startDate,
      endDate,
    });

    const productItemIds: string[] = [];
    const serviceItemIds: string[] = [];
    for (const row of rows) {
      if (row.itemType === "service") serviceItemIds.push(row.id);
      else productItemIds.push(row.id);
    }

    const [productLikes, productShares, serviceLikes, serviceShares] = await Promise.all([
      this.likeService.getLikeCountsForItems(productItemIds, "product"),
      this.shareService.getShareCountsForItems(productItemIds, "product"),
      this.likeService.getLikeCountsForItems(serviceItemIds, "service"),
      this.shareService.getShareCountsForItems(serviceItemIds, "service"),
    ]);

    const enrichedItems = rows.map((row) => {
      const isService = row.itemType === "service";
      return {
        ...row,
        likesCount: (isService ? serviceLikes : productLikes).get(row.id) ?? 0,
        sharesCount: (isService ? serviceShares : productShares).get(row.id) ?? 0,
      };
    });

    return {
      meta: {
        total,
        page: pageNum,
        limit: limitNum,
        totalPages: Math.ceil(total / limitNum),
      },
      data: enrichedItems,
    };
  }

  /** Suspend/enable a single product (e.g. a feed video). Mirrors ShopService.setShopDisabled. */
  async setProductDisabled(productId: string, disabled: boolean) {
    const existing = await this.prisma.product.findUnique({ where: { id: productId } });
    if (!existing) {
      throw new NotFoundException(
        this.i18n.translate("auth.products.product_not_found", { lang: this.lang }),
      );
    }
    const product = await this.prisma.product.update({
      where: { id: productId },
      data: { isDisabled: disabled },
    });
    return this.toApiShape(product);
  }
}
