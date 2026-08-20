import {
  Injectable,
  NotFoundException,
  InternalServerErrorException,
  ForbiddenException,
  BadRequestException,
  Inject,
  forwardRef,
} from "@nestjs/common";
import { InjectModel } from "@nestjs/mongoose";
import { FilterQuery, Model, Types } from "mongoose";
import { I18nService } from "nestjs-i18n";
import { Product, ProductDocument } from "./schema/product.schema";
import { Counter, CounterDocument } from "src/common/schema/counter.schema";
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
import { ReviewService } from "src/reviews/reviews.service";
import { assertOwnerOrPermission } from "src/common/utils/permission.utils";
import { PermissionEntry } from "src/common/constants/admin-permissions.constants";
import { ActivityLogService } from "src/activity-log/activity-log.service";

@Injectable()
export class ProductsService {
  constructor(
    @InjectModel(Product.name)
    private readonly productModel: Model<ProductDocument>,
    @InjectModel(Counter.name)
    private readonly counterModel: Model<CounterDocument>,
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
    private readonly reviewService: ReviewService,
    private readonly activityLogService: ActivityLogService,
  ) { }

  private get lang(): string {
    return this.cls.get("lang") || "en";
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
    const counter = await this.counterModel.findByIdAndUpdate(
      "listingCode",
      { $inc: { seq: 1 } },
      { new: true, upsert: true },
    );
    return `LST-${String(counter.seq).padStart(6, "0")}`;
  }

  /** Atomically reserves the next sequential video code (e.g. VID-000001), for products that have a video (feed videos). */
  private async generateNextVideoCode(): Promise<string> {
    const counter = await this.counterModel.findByIdAndUpdate(
      "videoCode",
      { $inc: { seq: 1 } },
      { new: true, upsert: true },
    );
    return `VID-${String(counter.seq).padStart(6, "0")}`;
  }

  async create(
    entityId: string,
    type: "shop" | "personal",
    dto: CreateProductDto,
  ): Promise<{ message: string; data: { product: Product } }> {
    try {
      console.log("Creating product for entityId:", entityId, "type:", type, "dto:", dto);

      let location: { type: "Point"; coordinates: [number, number] };

      const productPayload: Partial<Product> = {
        ...dto,
        category: new Types.ObjectId(dto.category),
      };

      if (type === "shop") {
        const shop = await this.shopService.getShopById(entityId);
        if (!shop) {
          throw new NotFoundException(
            this.i18n.translate("auth.products.shop_not_found", {
              lang: this.lang,
            }),
          );
        }

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

        productPayload.shopId = shop._id as Types.ObjectId;
        location = shop.location;
        console.log("product payload", productPayload);
      } else if (type === "personal") {
        const user = await this.userService.findUserById(entityId);
        if (!user) {
          throw new NotFoundException(
            this.i18n.translate("auth.products.user_not_found", {
              lang: this.lang,
            }),
          );
        }

        productPayload.ownerId = user._id as Types.ObjectId;

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
          productPayload.address = dto.address.trim();
        }
      } else {
        throw new BadRequestException(
          'Invalid type. Must be "shop" or "personal".',
        );
      }

      console.log("Product Payload:", productPayload);
      const listingCode = await this.generateNextListingCode();

      const createdProduct = new this.productModel({
        ...productPayload,
        listingCode,
        location, // always a proper object now
        images: [],
        video: "",
        category: new Types.ObjectId(dto.category),
      });

      let imageUrls: string[] = [];
      if (dto?.images?.length) {
        const uploadedFiles = await this.fileUploadService.uploadProductFiles(
          dto.images,
          type,
          entityId,
          (createdProduct._id as Types.ObjectId).toString(),
          "images",
        );
        imageUrls = uploadedFiles.map((file) => file.url);
        createdProduct.images = imageUrls;
      }
      console.log(dto?.video, "Video Length", dto?.video);
      if (dto?.video) {
        const uploadedVideo = await this.fileUploadService.uploadProductFiles(
          [dto.video],
          type,
          entityId,
          (createdProduct._id as Types.ObjectId).toString(),
          "video",
        );
        console.log("Uploaded Video:", uploadedVideo);
        createdProduct.video = uploadedVideo[0].url;
        createdProduct.videoCode = await this.generateNextVideoCode();
      }

      if (createdProduct.parameters && createdProduct.parameters.length > 0) {
        createdProduct.searchableTags = [
          ...createdProduct.parameters.flatMap((p) => [p.name, ...p.variants]),
        ];
      } else {
        createdProduct.searchableTags = [];
      }

      const result = await createdProduct.save();
      return {
        message: this.i18n.translate("auth.products.created_success", {
          lang: this.lang,
        }),
        data: {
          product: result,
        },
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
  ): Promise<PaginatedResponseDto<Product>> {
    const { page = 1, limit = 10 } = paginationDto;
    const skip = (page - 1) * limit;

    const [items, total] = await Promise.all([
      this.productModel
        .find({
          shopId: new Types.ObjectId(shopId),
          isDeleted: false,
          isDisabled: false,
        })
        .populate("category")
        .populate("shopId")
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit),
      this.productModel.countDocuments({
        shopId: new Types.ObjectId(shopId),
        isDeleted: false,
        isDisabled: false,
      }),
    ]);

    return {
      meta: { total, page, limit, totalPages: Math.ceil(total / limit) },
      data: items,
    };
  }

  async getAllProductsByUser(
    ownerId: string,
    paginationDto: PaginationDto,
  ): Promise<PaginatedResponseDto<Product>> {
    const { page = 1, limit = 10 } = paginationDto;
    const skip = (page - 1) * limit;

    console.log("Fetching products for user:", ownerId);
    const [items, total] = await Promise.all([
      this.productModel
        .find({
          ownerId: new Types.ObjectId(ownerId),
          isDeleted: false,
          isDisabled: false,
        })
        .populate("category")
        .populate("ownerId")
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit),
      this.productModel.countDocuments({
        ownerId,
        isDeleted: false,
        isDisabled: false,
      }),
    ]);

    return {
      meta: { total, page, limit, totalPages: Math.ceil(total / limit) },
      data: items,
    };
  }

  async getById(id: string, userId?: string): Promise<any> {
    const product = await this.productModel
      .findOne({
        _id: new Types.ObjectId(id),
        isDeleted: false,
        isDisabled: false,
      })
      .populate("category")
      .populate({
        path: "shopId",
        populate: {
          path: "ownerId",
          select: "_id name phone",
        },
      })
      .populate({
        path: "ownerId",
      })
      .lean();

    if (!product)
      throw new NotFoundException(
        this.i18n.translate("auth.products.product_not_found", {
          lang: this.lang,
        }),
      );

    console.log("userId", userId);
    // If there's no logged-in user, return product as-is
    if (!userId) return product;

    // Otherwise include whether the user liked / reviewed this product
    const [isLiked, userReview] = await Promise.all([
      this.likeService.isLiked(userId, id, "product"),
      this.reviewService.findOne(userId, id, "product"),
    ]);

    const plain = product.toObject ? product.toObject() : product;

    console.log("Product Details:", plain);
    console.log("Is Liked by User:", isLiked);
    console.log("User's Review:", userReview);
    return {
      ...plain,
      isLiked: !!isLiked,
      isReviewed: userReview || null,
    } as any;
  }

  async update(
    productId: string,
    updateDto: UpdateProductDto,
    currentUser?: { sub: string; roles?: string[]; permissions?: PermissionEntry[] },
  ): Promise<any> {
    if ("shopId" in updateDto) {
      throw new ForbiddenException(
        this.i18n.translate("auth.products.shop_cant_update", {
          lang: this.lang,
        }),
      );
    }

    if (updateDto.category) {
      (updateDto as any).category = new Types.ObjectId(updateDto.category);
    }

    // Remove empty / null / undefined fields
    Object.keys(updateDto).forEach((key) => {
      if (
        updateDto[key] === "" ||
        updateDto[key] === null ||
        typeof updateDto[key] === "undefined"
      ) {
        delete updateDto[key];
      }
    });

    // ---------- LOCATION FIX ----------
    if (updateDto.location) {
      updateDto.location = this.parseAndValidateLocation(updateDto.location);
    }
    // ----------------------------------

    const existingProduct = await this.productModel.findOne({
      _id: new Types.ObjectId(productId),
      isDeleted: false,
      isDisabled: false,
    });

    if (!existingProduct) {
      throw new NotFoundException(
        this.i18n.translate("auth.products.product_not_found", {
          lang: this.lang,
        }),
      );
    }

    if (currentUser) {
      const resolvedOwnerId = existingProduct.shopId
        ? (await this.shopService.getShopOwnerId(existingProduct.shopId.toString())) ?? undefined
        : existingProduct.ownerId?.toString();
      assertOwnerOrPermission(currentUser, resolvedOwnerId ?? "", "listings", "edit");
    }

    if (updateDto.images && updateDto.images.length > 0) {
      const uploadedFiles = await this.fileUploadService.uploadProductFiles(
        updateDto.images,
        "shop",
        existingProduct.shopId
          ? existingProduct.shopId.toString()
          : existingProduct.ownerId!.toString(),
        productId,
        "images",
      );
      console.log("Uploaded Images:", uploadedFiles);
      const newImages = uploadedFiles.map((file) => file.url);
      updateDto.images = [...(existingProduct.images || []), ...newImages];
    }

    if (updateDto.video) {
      const uploadedVideo = await this.fileUploadService.uploadProductFiles(
        [updateDto.video],
        "shop",
        existingProduct.shopId
          ? existingProduct.shopId.toString()
          : existingProduct.ownerId!.toString(),
        productId,
        "video",
      );

      console.log("Uploaded Video:", uploadedVideo);
      updateDto.video = uploadedVideo[0].url;
      if (!existingProduct.videoCode) {
        (updateDto as any).videoCode = await this.generateNextVideoCode();
      }
    }

    // Also update searchableTags if parameters changed
    if (updateDto.parameters) {
      (updateDto as any).searchableTags = updateDto.parameters.flatMap(
        (p: any) => [p.name, ...p.variants],
      );
    }

    const updated = await this.productModel
      .findOneAndUpdate(
        {
          _id: new Types.ObjectId(productId),
          isDeleted: false,
          isDisabled: false,
        },
        updateDto,
        { new: true },
      )
      .exec();

    if (!updated) {
      throw new NotFoundException(
        this.i18n.translate("auth.products.product_not_found", {
          lang: this.lang,
        }),
      );
    }
    // await new Promise((resolve) => setTimeout(resolve, 2000));

    return {
      message: this.i18n.translate("auth.products.updated_success", {
        lang: this.lang,
      }),
      data: {
        product: updated,
      },
    };
  }

  async delete(
    productId: string,
    currentUser?: { sub: string; roles?: string[]; permissions?: PermissionEntry[] },
    lang: string = "en",
    ipAddress?: string,
  ) {
    const existingProduct = await this.productModel.findOne({
      _id: new Types.ObjectId(productId),
      isDeleted: false,
      isDisabled: false,
    });
    if (!existingProduct) {
      throw new NotFoundException(
        this.i18n.translate("auth.products.product_not_found", {
          lang: this.lang,
        }),
      );
    }
    const type = existingProduct.shopId ? "shop" : "personal";
    const entityId = existingProduct.shopId
      ? existingProduct.shopId.toString()
      : existingProduct.ownerId!.toString();

    let resolvedOwnerId: string | undefined;
    if (currentUser) {
      resolvedOwnerId = existingProduct.shopId
        ? (await this.shopService.getShopOwnerId(existingProduct.shopId.toString())) ?? undefined
        : existingProduct.ownerId?.toString();
      assertOwnerOrPermission(currentUser, resolvedOwnerId ?? "", "listings", "delete");
    }

    await this.fileUploadService.deleteEntityProducts(
      type,
      entityId,
      productId,
    );
    const result = await this.productModel.findByIdAndUpdate(
      new Types.ObjectId(productId),
      { isDeleted: true, images: [], video: "" },
    );
    if (!result)
      throw new NotFoundException(
        this.i18n.translate("auth.products.product_not_found", {
          lang: this.lang,
        }),
      );

    if (currentUser && resolvedOwnerId && resolvedOwnerId !== currentUser.sub) {
      await this.activityLogService.record(
        currentUser.sub,
        "listing_deleted",
        "Product",
        productId,
        existingProduct.title,
        ipAddress,
      );
    }

    return existingProduct;
  }

  async deleteProductMedia(
    productId: string,
    media: string[],
    currentUser?: { sub: string; roles?: string[]; permissions?: PermissionEntry[] },
  ) {
    const existingProduct = await this.productModel.findOne({
      _id: new Types.ObjectId(productId),
      isDeleted: false,
      isDisabled: false,
    });
    if (!existingProduct) {
      throw new NotFoundException(
        this.i18n.translate("auth.products.product_not_found", {
          lang: this.lang,
        }),
      );
    }
    if (!media || media.length === 0) {
      throw new BadRequestException(
        this.i18n.translate("auth.products.no_media_provided", {
          lang: this.lang,
        }),
      );
    }

    if (currentUser) {
      const resolvedOwnerId = existingProduct.shopId
        ? (await this.shopService.getShopOwnerId(existingProduct.shopId.toString())) ?? undefined
        : existingProduct.ownerId?.toString();
      assertOwnerOrPermission(currentUser, resolvedOwnerId ?? "", "listings", "edit");
    }

    // Remove media files from storage
    await this.fileUploadService.deleteFiles(media);

    // Remove media from product document
    let images = existingProduct.images || [];
    let video = existingProduct.video;

    // Remove any images that match the URLs
    images = images.filter((imgUrl) => !media.includes(imgUrl));

    // Remove video if its URL is in the media array
    if (media.includes(video)) {
      video = "";
    }

    // Update the product
    existingProduct.images = images;
    existingProduct.video = video;
    await existingProduct.save();

    return true;
  }

  async searchNearbyWithCategory(
    category: string,
    coordinates: [number, number],
    radius: number,
    pagination: PaginationDto,
  ) {
    return this.listingUtils.findNearbyWithCategory(
      this.productModel,
      category,
      coordinates,
      radius,
      pagination,
    );
  }

  async getAllForAdmin(
    paginationDto: PaginationDto,
    search?: string,
  ): Promise<PaginatedResponseDto<Product>> {
    const { page = 1, limit = 10 } = paginationDto;
    const skip = (page - 1) * limit;

    const filter: FilterQuery<ProductDocument> = {};

    if (search && search.trim()) {
      const term = search.trim();
      filter.$or = [
        { title: { $regex: term, $options: "i" } },
        { description: { $regex: term, $options: "i" } },
        { "category.name.en": { $regex: term, $options: "i" } },
        { "category.name.ur": { $regex: term, $options: "i" } },
      ];
    }

    const [items, total] = await Promise.all([
      this.productModel
        .find(filter)
        .populate("category")
        .populate("shopId")
        .populate("ownerId")
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .exec(),
      this.productModel.countDocuments(filter),
    ]);

    return {
      meta: { total, page, limit, totalPages: Math.ceil(total / limit) },
      data: items,
    };
  }

  async updateStatus(productId: string, isDisabled: boolean) {
    const updated = await this.productModel.findByIdAndUpdate(
      new Types.ObjectId(productId),
      { isDisabled },
      { new: true },
    );

    if (!updated) {
      throw new NotFoundException(
        this.i18n.translate("auth.products.product_not_found", {
          lang: this.lang,
        }),
      );
    }

    return {
      message: isDisabled
        ? this.i18n.translate("auth.products.product_disabled_success", {
          lang: this.lang,
        })
        : this.i18n.translate("auth.products.product_enabled_success", {
          lang: this.lang,
        }),
      data: updated,
    };
  }

  async findNearbyProductShopOwnerIds(
    categoryId: string,
    coordinates: [number, number],
    radiusInMeters: number,
  ): Promise<string[]> {
    const results = await this.productModel.aggregate([
      {
        $geoNear: {
          near: { type: "Point", coordinates },
          distanceField: "distance",
          maxDistance: radiusInMeters,
          query: {
            category: new Types.ObjectId(categoryId),
            isDeleted: false,
            isDisabled: false,
          },
          spherical: true,
        },
      },
      {
        $lookup: {
          from: "shops",
          localField: "shopId",
          foreignField: "_id",
          as: "shop",
        },
      },
      {
        $unwind: {
          path: "$shop",
          preserveNullAndEmptyArrays: true,
        },
      },
      {
        $project: {
          ownerId: {
            $ifNull: ["$shop.ownerId", "$ownerId"],
          },
        },
      },
      {
        $match: {
          ownerId: { $exists: true, $ne: null },
        },
      },
      {
        $group: {
          _id: "$ownerId",
        },
      },
    ]);

    return results
      .map((result) => result._id?.toString())
      .filter(Boolean);
  }

  async updateLocationByShopId(
    shopId: string,
    location: { type: "Point"; coordinates: [number, number] },
  ) {
    await this.productModel.updateMany({ shopId }, { $set: { location } });
  }

  async setDisabledByShop(shopId: string, disabled: boolean) {
    await this.productModel.updateMany(
      { shopId: new Types.ObjectId(shopId) },
      { $set: { isDisabled: disabled } },
    );
  }

  async setProductsDisabledByShopsBulk(shopIds: any[], disabled: boolean) {
    await this.productModel.updateMany(
      { shopId: { $in: shopIds } },
      { $set: { isDisabled: disabled } },
    );
  }

  async setProductsDisabledByUser(userId: string, disabled: boolean) {
    await this.productModel.updateMany(
      { ownerId: new Types.ObjectId(userId) },
      { $set: { isDisabled: disabled } },
    );
  }

  async searchProducts(query: SearchAllProductsServiceDto) {
    const page = Math.max(1, query.page || 1);
    const limit = Math.max(1, query.limit || 10);
    const skip = (page - 1) * limit;

    const allPromotedIds =
      await this.promotionService.getActivePromotionProductIds();

    const baseFilter: FilterQuery<ProductDocument> = {
      isDeleted: false,
      isDisabled: false,
    };

    if (query.category) {
      baseFilter.category = new Types.ObjectId(query.category);
    }

    if (query.startDate || query.endDate) {
      const createdAt: Record<string, Date> = {};
      if (query.startDate) {
        createdAt.$gte = new Date(query.startDate);
      }
      if (query.endDate) {
        const endOfDay = new Date(query.endDate);
        endOfDay.setHours(23, 59, 59, 999);
        createdAt.$lte = endOfDay;
      }
      baseFilter.createdAt = createdAt;
    }

    const searchTerm = query.name?.trim();

    // === Promoted Products ===
    const promotedProducts = await this.productModel
      .find({
        _id: { $in: allPromotedIds },
        ...baseFilter,
      })
      .sort({ createdAt: -1 })
      .lean()
      .exec();

    const promotedProductIds = promotedProducts.map((p: any) =>
      new Types.ObjectId(p._id).toString(),
    );

    // === Regular Products ===
    let regularFilter: FilterQuery<ProductDocument> = {
      ...baseFilter,
      _id: { $nin: promotedProductIds.map((id) => new Types.ObjectId(id)) },
    };

    if (searchTerm) {
      regularFilter.$or = [
        { title: { $regex: searchTerm, $options: "i" } },
        { description: { $regex: searchTerm, $options: "i" } },
        { "parameters.name": { $regex: searchTerm, $options: "i" } },
        { "parameters.variants": { $regex: searchTerm, $options: "i" } },
        { listingCode: { $regex: searchTerm, $options: "i" } },
      ];
    }

    const [regularProducts, total] = await Promise.all([
      this.productModel
        .find(regularFilter)
        .populate("category")
        // IMPORTANT: Do NOT select or sort by textScore when using $or + regex
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .lean()
        .exec(),

      this.productModel.countDocuments(regularFilter),
    ]);

    const [enrichedPromotions, enrichedRegularProducts] = await Promise.all([
      this.enrichProductsWithReviewStats(promotedProducts),
      this.enrichProductsWithReviewStats(regularProducts),
    ]);

    return {
      data: {
        promotions: enrichedPromotions,
        items: enrichedRegularProducts,
      },
      meta: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  private async enrichProductsWithReviewStats(products: any[]) {
    if (!products || products.length === 0) {
      return products;
    }

    const productIds = products.map((product) =>
      new Types.ObjectId(product._id),
    );
    const reviewStats = await this.reviewService.getAverageRatingsForItems(
      productIds,
      "product",
    );

    const reviewMap = new Map(
      reviewStats.map((item: any) => [
        (item._id as Types.ObjectId).toString(),
        {
          avgRating: item.avgRating ?? 0,
          reviewCount: item.count ?? 0,
        },
      ]),
    );

    return products.map((product: any) => {
      const stats = reviewMap.get(new Types.ObjectId(product._id).toString());
      return {
        ...product,
        averageRating: stats?.avgRating
          ? Number(stats.avgRating.toFixed(1))
          : 0,
        reviewCount: stats?.reviewCount ?? 0,
      };
    });
  }

  async getProductsWithVideos(
    paginationDto: PaginationDto & { search?: string },
    userId?: string,
    category?: string,
  ): Promise<PaginatedResponseDto<any>> {
    const { page = 1, limit = 10, search } = paginationDto;
    const skip = (page - 1) * limit;

    const filter: FilterQuery<ProductDocument> = {
      video: { $exists: true, $nin: ["", null] },
      isDeleted: false,
      isDisabled: false,
    };
    if (category) {
      filter.category = new Types.ObjectId(category);
    }
    if (search?.trim()) {
      filter.title = { $regex: search.trim(), $options: "i" };
    }

    const [items, total] = await Promise.all([
      this.productModel
        .find(filter)
        .populate("category")
        .populate({
          path: "shopId",
          select: "_id title image address description ownerId banner", // be explicit
        })
        .populate({
          path: "ownerId",
          select: "_id name image address phone", // be explicit
        })
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .lean()                    // keep it for performance
        .exec(),

      this.productModel.countDocuments(filter).exec(),
    ]);

    if (!userId) {
      return {
        meta: { total, page, limit, totalPages: Math.ceil(total / limit) },
        data: items,
      };
    }

    const user = await this.userService.findUserById(userId);
    if (!user) {
      throw new NotFoundException(
        this.i18n.translate("auth.users.user_not_found", {
          lang: this.lang,
        }),
      );
    }

    const productIds = items.map((item: any) => new Types.ObjectId(item._id));
    const likes = await this.likeService.getLikesByUser(
      userId,
      "product",
      productIds,
    );

    console.log("Products with Likes:", likes);

    const likedProductIds = new Set(
      likes.map((like: any) => like.itemId.toString()),
    );
    console.log("Liked Product IDs:", likedProductIds);

    const data = items.map((item: any) => ({
      ...item, // Now safe because of .lean()
      isLiked: likedProductIds.has(item._id.toString()),
    }));

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

  /** Admin-only: same as getProductsWithVideos but includes suspended (isDisabled) videos too, so they can be reviewed/re-enabled. */
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

    const filter: FilterQuery<ProductDocument> = {
      video: { $exists: true, $nin: ["", null] },
      isDeleted: false,
    };
    if (search?.trim()) {
      filter.title = { $regex: search.trim(), $options: "i" };
    }
    if (startDate || endDate) {
      const createdAt: Record<string, Date> = {};
      if (startDate) {
        createdAt.$gte = new Date(startDate);
      }
      if (endDate) {
        const endOfDay = new Date(endDate);
        endOfDay.setHours(23, 59, 59, 999);
        createdAt.$lte = endOfDay;
      }
      filter.createdAt = createdAt;
    }

    const [items, total] = await Promise.all([
      this.productModel
        .find(filter)
        .populate("category")
        .populate({
          path: "shopId",
          select: "_id title image address ownerId",
        })
        .populate({
          path: "ownerId",
          select: "_id name image",
        })
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limitNum)
        .lean()
        .exec(),

      this.productModel.countDocuments(filter).exec(),
    ]);

    return {
      meta: {
        total,
        page: pageNum,
        limit: limitNum,
        totalPages: Math.ceil(total / limitNum),
      },
      data: items,
    };
  }

  /** Suspend/enable a single product (e.g. a feed video). Mirrors ShopService.setShopDisabled. */
  async setProductDisabled(productId: string, disabled: boolean) {
    const product = await this.productModel.findByIdAndUpdate(
      productId,
      { $set: { isDisabled: disabled } },
      { new: true },
    );
    if (!product) {
      throw new NotFoundException(
        this.i18n.translate("auth.products.product_not_found", {
          lang: this.lang,
        }),
      );
    }
    return product;
  }
}
