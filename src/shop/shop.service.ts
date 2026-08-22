import {
  forwardRef,
  Inject,
  Injectable,
  NotFoundException,
} from "@nestjs/common";
import { InjectModel } from "@nestjs/mongoose";
import { Model, Types } from "mongoose";
import { PaginationDto } from "src/common/dto/pagination.dto";
import { PaginatedResponseDto } from "src/common/dto/pagination-response.dto";
import { I18nService } from "nestjs-i18n";
import { Shop, ShopDocument } from "./schema/shop.schema";
import { ShopView, ShopViewDocument } from "./schema/shop-view.schema";
import { ShopProductView, ShopProductViewDocument } from "./schema/shop-product-view.schema";
import { ShopContactClick, ShopContactClickDocument } from "./schema/shop-contact-click.schema";
import { ShopWhatsappClick, ShopWhatsappClickDocument } from "./schema/shop-whatsapp-click.schema";
import { Counter, CounterDocument } from "src/common/schema/counter.schema";
import { CreateUpdateShopDto } from "./dto/create-update-shop.dto";
import { ProductsService } from "src/products/products.service";
import { UsersService } from "src/users/users.service";
import { FileUploadService } from "src/common/file-upload/file-upload.service";
import { ClsService } from "nestjs-cls";
import { OrdersService } from "src/orders/orders.service";
import { assertOwnerOrPermission } from "src/common/utils/permission.utils";
import { PermissionEntry } from "src/common/constants/admin-permissions.constants";

@Injectable()
export class ShopService {
  constructor(
    @InjectModel(Shop.name) private shopModel: Model<ShopDocument>,
    @InjectModel(ShopView.name) private shopViewModel: Model<ShopViewDocument>,
    @InjectModel(ShopProductView.name) private shopProductViewModel: Model<ShopProductViewDocument>,
    @InjectModel(ShopContactClick.name) private shopContactClickModel: Model<ShopContactClickDocument>,
    @InjectModel(ShopWhatsappClick.name) private shopWhatsappClickModel: Model<ShopWhatsappClickDocument>,
    @InjectModel(Counter.name) private counterModel: Model<CounterDocument>,
    @Inject(forwardRef(() => ProductsService))
    private readonly productsService: ProductsService,
    @Inject(forwardRef(() => UsersService))
    private readonly usersService: UsersService,
    private readonly fileUploadService: FileUploadService,
    @Inject(forwardRef(() => OrdersService))
    private readonly ordersService: OrdersService,
    private readonly i18n: I18nService,
    private readonly cls: ClsService,
  ) { }

  private get lang(): string {
    return this.cls?.get("lang") ?? "en";
  }
  /** Atomically reserves the next sequential shop code (e.g. SHP-000083). */
  private async generateNextShopCode(): Promise<string> {
    const counter = await this.counterModel.findByIdAndUpdate(
      "shopCode",
      { $inc: { seq: 1 } },
      { new: true, upsert: true },
    );
    return `SHP-${String(counter.seq).padStart(6, "0")}`;
  }

  async createShop(ownerId: Types.ObjectId, dto: CreateUpdateShopDto) {
    const existingUser = await this.usersService.findUserById(
      ownerId.toString(),
    );
    if (!existingUser) {
      throw new NotFoundException(
        this.i18n.translate("auth.shop.user_not_found", { lang: this.lang }),
      );
    }

    const { image: imageFile, banner: bannerFile, ...shopDto } = dto as any;
    const shopCode = await this.generateNextShopCode();

    const shop = new this.shopModel({
      ...shopDto,
      shopCode,
      ownerId,
      category: new Types.ObjectId(dto.category),
      subcategory: dto.subcategory
        ? new Types.ObjectId(dto.subcategory)
        : undefined,
    });

    const results = await shop.save();
    const updatePayload: Partial<Shop> = {};

    if (imageFile) {
      updatePayload.image = await this.fileUploadService.uploadShopImage(
        results._id as string,
        imageFile,
      );
    }

    if (bannerFile) {
      updatePayload.banner = await this.fileUploadService.uploadShopBanner(
        results._id as string,
        bannerFile,
      );
    }

    if (Object.keys(updatePayload).length > 0) {
      Object.assign(results, updatePayload);
      await results.save();
    }

    return {
      message: this.i18n.translate("auth.shop.created_success", {
        lang: this.lang,
      }),
      data: results,
    };
  }

  async updateShop(
    shopId: string,
    dto: CreateUpdateShopDto,
    currentUser?: { sub: string; roles?: string[]; permissions?: PermissionEntry[] },
  ): Promise<{ message: string; data: Shop }> {
    const existingShop = await this.shopModel.findById(shopId);
    if (!existingShop) {
      throw new NotFoundException(
        this.i18n.translate("auth.shop.shop_not_found", { lang: this.lang }),
      );
    }

    if (currentUser) {
      assertOwnerOrPermission(currentUser, existingShop.ownerId?.toString() ?? "", "shops", "edit");
    }

    const { image, banner, ...safeDto } = dto as any;
    const updateData: any = { ...safeDto };

    // Convert category & subcategory to ObjectId
    if (dto.category) {
      updateData.category = new Types.ObjectId(dto.category);
    }

    if (dto.subcategory) {
      updateData.subcategory = new Types.ObjectId(dto.subcategory);
    } else if (dto.subcategory === null || dto.subcategory === "") {
      updateData.subcategory = null; // allow clearing subcategory
    }

    // Handle image upload
    if (image) {
      updateData.image = await this.fileUploadService.uploadShopImage(
        shopId,
        image,
      );
    }

    // Handle banner upload
    if (banner) {
      updateData.banner = await this.fileUploadService.uploadShopBanner(
        shopId,
        banner,
      );
    }

    const updated = await this.shopModel.findByIdAndUpdate(
      shopId,
      updateData,
      { new: true },
    );

    // Sync location to products if location was updated
    if (dto.location) {
      this.productsService.updateLocationByShopId(shopId, dto.location);
    }

    if (!updated) {
      throw new NotFoundException(
        this.i18n.translate("auth.shop.shop_not_found", { lang: this.lang }),
      );
    }

    return {
      message: this.i18n.translate("auth.shop.updated_success", {
        lang: this.lang,
      }),
      data: updated.toJSON(),
    };
  }

  /** Lightweight ownership lookup, used to let a shop owner act on their own resources
   *  (e.g. deleting their own listing) without a full shop fetch. */
  async getShopOwnerId(shopId: string): Promise<string | null> {
    const shop = await this.shopModel.findById(shopId).select("ownerId").lean();
    return shop?.ownerId ? shop.ownerId.toString() : null;
  }

  async getShopById(shopId: string) {
    const shop = await this.shopModel
      .findById(shopId)
      .populate("ownerId", "name email")
      .populate("category", "name")
      .populate("subcategory", "name");

    if (!shop) {
      throw new NotFoundException(
        this.i18n.translate("auth.shop.shop_not_found", { lang: this.lang }),
      );
    }

    const productsCount = await this.productsService.getAllProductsByShop(
      shopId,
      { page: 1, limit: 1 },
    );
    const ordersCount = await this.ordersService.getOrdersByOwner(
      shopId,
      "Shop",
      1,
      1,
    );
    // Total Views: distinct users who have opened the shop's own page (deduped, forever).
    const totalViews = await this.shopViewModel.countDocuments({
      shopId: new Types.ObjectId(shopId),
    });
    // Unique Visitors: distinct users who have opened at least one product from this shop.
    const uniqueVisitorsCount = await this.shopProductViewModel.countDocuments({
      shopId: new Types.ObjectId(shopId),
    });
    // Contact/WhatsApp Clicks: distinct users who've clicked, deduped forever (repeat clicks don't recount).
    const contactClicks = await this.shopContactClickModel.countDocuments({
      shopId: new Types.ObjectId(shopId),
    });
    const whatsappClicks = await this.shopWhatsappClickModel.countDocuments({
      shopId: new Types.ObjectId(shopId),
    });

    return {
      ...shop.toJSON(),
      productsCount: productsCount.meta.total,
      ordersCount: ordersCount.meta.total,
      totalViews,
      uniqueVisitorsCount,
      contactClicks,
      whatsappClicks,
    };
  }

  /** Records a shop-page view: always increments the raw totalViews counter,
   *  and dedupes into a per-(shop,user) row so unique visitors can be counted
   *  by row count. Skips the shop owner viewing their own shop entirely. */
  async trackView(shopId: string, userId: string): Promise<void> {
    if (!Types.ObjectId.isValid(shopId)) return;

    const shop = await this.shopModel
      .findById(shopId)
      .select("ownerId")
      .lean();
    if (!shop || shop.ownerId.toString() === userId) return;

    await this.shopViewModel.updateOne(
      { shopId: new Types.ObjectId(shopId), userId: new Types.ObjectId(userId) },
      { $setOnInsert: { shopId: new Types.ObjectId(shopId), userId: new Types.ObjectId(userId) } },
      { upsert: true },
    );
  }

  /** Records that a user opened a product belonging to this shop (deduped per shop+user, regardless of which product). */
  async trackProductView(shopId: string, userId: string): Promise<void> {
    if (!Types.ObjectId.isValid(shopId)) return;

    const shop = await this.shopModel
      .findById(shopId)
      .select("ownerId")
      .lean();
    if (!shop || shop.ownerId.toString() === userId) return;

    await this.shopProductViewModel.updateOne(
      { shopId: new Types.ObjectId(shopId), userId: new Types.ObjectId(userId) },
      { $setOnInsert: { shopId: new Types.ObjectId(shopId), userId: new Types.ObjectId(userId) } },
      { upsert: true },
    );
  }

  /** Records a "Chat Store" click attributed to the shop. Deduped per (shop, user) — repeat clicks by the same user don't recount. */
  async trackContactClick(shopId: string, userId: string): Promise<void> {
    if (!Types.ObjectId.isValid(shopId)) return;

    const shop = await this.shopModel
      .findById(shopId)
      .select("ownerId")
      .lean();
    if (!shop || shop.ownerId.toString() === userId) return;

    await this.shopContactClickModel.updateOne(
      { shopId: new Types.ObjectId(shopId), userId: new Types.ObjectId(userId) },
      { $setOnInsert: { shopId: new Types.ObjectId(shopId), userId: new Types.ObjectId(userId) } },
      { upsert: true },
    );
  }

  /** Records a "WhatsApp" click attributed to the shop. Deduped per (shop, user) — repeat clicks by the same user don't recount. */
  async trackWhatsappClick(shopId: string, userId: string): Promise<void> {
    if (!Types.ObjectId.isValid(shopId)) return;

    const shop = await this.shopModel
      .findById(shopId)
      .select("ownerId")
      .lean();
    if (!shop || shop.ownerId.toString() === userId) return;

    await this.shopWhatsappClickModel.updateOne(
      { shopId: new Types.ObjectId(shopId), userId: new Types.ObjectId(userId) },
      { $setOnInsert: { shopId: new Types.ObjectId(shopId), userId: new Types.ObjectId(userId) } },
      { upsert: true },
    );
  }

  async getAllShopsByUser(userId: string): Promise<Shop[]> {
    return this.shopModel
      .find({ ownerId: new Types.ObjectId(userId) })
      .populate("category", "name")
      .populate("subcategory", "name")
      .exec();
  }

  async getAllShopsByUserPaginated(
    userId: string,
    paginationDto: PaginationDto,
  ): Promise<PaginatedResponseDto<Shop>> {
    const { page = 1, limit = 10 } = paginationDto;
    const skip = (page - 1) * limit;
    const query = { ownerId: new Types.ObjectId(userId) };

    const [shops, total] = await Promise.all([
      this.shopModel.find(query).sort({ createdAt: -1 }).skip(skip).limit(limit).lean().exec(),
      this.shopModel.countDocuments(query),
    ]);

    return {
      data: shops,
      meta: { total, page, limit, totalPages: Math.ceil(total / limit) },
    };
  }

  async getAllShops(paginationDto: PaginationDto): Promise<PaginatedResponseDto<Shop>> {
    const { page = 1, limit = 10, search, startDate, endDate } = paginationDto;
    const skip = (page - 1) * limit;

    const query: Record<string, any> = {};

    if (search?.trim()) {
      const trimmedSearch = search.trim();
      query.$or = [
        { title: { $regex: trimmedSearch, $options: "i" } },
        { shopCode: { $regex: trimmedSearch, $options: "i" } },
      ];
    }

    if (startDate || endDate) {
      query.createdAt = {};
      if (startDate) {
        query.createdAt.$gte = new Date(startDate);
      }
      if (endDate) {
        const endOfDay = new Date(endDate);
        endOfDay.setHours(23, 59, 59, 999);
        query.createdAt.$lte = endOfDay;
      }
    }

    const [shops, total] = await Promise.all([
      this.shopModel
        .find(query)
        .skip(skip)
        .limit(limit)
        .sort({ createdAt: -1 })
        .lean()
        .exec(),
      this.shopModel.countDocuments(query),
    ]);

    return {
      data: shops,
      meta: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  async setShopDisabled(shopId: string, disabled: boolean) {
    const shop = await this.shopModel.findByIdAndUpdate(
      shopId,
      { $set: { isDisabled: disabled } },
      { new: true },
    );
    if (!shop) {
      throw new NotFoundException(
        this.i18n.translate("auth.shop.shop_not_found", { lang: this.lang }),
      );
    }
    return shop;
  }

  async setShopsDisabledBulk(shopIds: any[], disabled: boolean) {
    await this.shopModel.updateMany(
      { _id: { $in: shopIds } },
      { $set: { isDisabled: disabled } },
    );
  }

  // Original simple near-query kept for backward compatibility
  async findShopsNearLocation(
    location: [number, number],
    radiusInMeters: number,
  ): Promise<Shop[]> {
    return this.shopModel.find({
      location: {
        $near: {
          $geometry: {
            type: "Point",
            coordinates: location,
          },
          $maxDistance: radiusInMeters,
        },
      },
      isDisabled: false,
    });
  }

  // New paginated geo search that returns meta and data
  async findShopsNearLocationPaginated(
    location: [number, number],
    radiusInMeters: number,
    pagination?: PaginationDto,
  ): Promise<PaginatedResponseDto<Shop>> {
    const { page = 1, limit = 10 } = pagination || {};
    const skip = (page - 1) * limit;

    const query: Record<string, any> = { isDisabled: false };

    const [data, countAgg] = await Promise.all([
      this.shopModel.aggregate([
        {
          $geoNear: {
            near: { type: "Point", coordinates: location },
            distanceField: "distance",
            maxDistance: radiusInMeters,
            query,
            spherical: true,
          },
        },
        {
          $lookup: {
            from: "categories",
            localField: "category",
            foreignField: "_id",
            as: "category",
          },
        },
        { $unwind: { path: "$category", preserveNullAndEmptyArrays: true } },
        {
          $lookup: {
            from: "categories",
            localField: "subcategory",
            foreignField: "_id",
            as: "subcategory",
          },
        },
        {
          $unwind: { path: "$subcategory", preserveNullAndEmptyArrays: true },
        },
        { $sort: { createdAt: -1 } },
        { $skip: skip },
        { $limit: limit },
      ]),
      this.shopModel.aggregate([
        {
          $geoNear: {
            near: { type: "Point", coordinates: location },
            distanceField: "distance",
            maxDistance: radiusInMeters,
            query,
            spherical: true,
          },
        },
        { $count: "total" },
      ]),
    ]);

    const total = countAgg[0]?.total || 0;

    return {
      meta: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
      data,
    };
  }
}
