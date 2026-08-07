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

@Injectable()
export class ProductsService {
  constructor(
    @InjectModel(Product.name)
    private readonly productModel: Model<ProductDocument>,
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

      const createdProduct = new this.productModel({
        ...productPayload,
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
      }

      if (createdProduct.parameters && createdProduct.parameters.length > 0) {
        createdProduct.searchableTags = [
          ...createdProduct.parameters.flatMap((p) => [p.name, ...p.variants]),
        ];
      } else {
        createdProduct.searchableTags = [];
      }

      const result = await createdProduct.save();
      await new Promise((resolve) => setTimeout(resolve, 2000));
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
    if (!userId) return product;

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

  async update(productId: string, updateDto: UpdateProductDto): Promise<any> {
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
    await new Promise((resolve) => setTimeout(resolve, 2000));

    return {
      message: this.i18n.translate("auth.products.updated_success", {
        lang: this.lang,
      }),
      data: {
        product: updated,
      },
    };
  }

  async delete(productId: string, lang: string = "en"): Promise<void> {
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
  }

  async deleteProductMedia(productId: string, media: string[]) {
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

    await this.fileUploadService.deleteFiles(media);

    let images = existingProduct.images || [];
    let video = existingProduct.video;

    images = images.filter((imgUrl) => !media.includes(imgUrl));

    if (media.includes(video)) {
      video = "";
    }

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
      ];
    }

    const [regularProducts, total] = await Promise.all([
      this.productModel
        .find(regularFilter)
        .populate("category")
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
    paginationDto: PaginationDto,
    userId?: string,
    category?: string,
  ): Promise<PaginatedResponseDto<any>> {
    const { page = 1, limit = 10 } = paginationDto;
    const skip = (page - 1) * limit;

    const filter: FilterQuery<ProductDocument> = {
      video: { $exists: true, $nin: ["", null] },
      isDeleted: false,
      isDisabled: false,
    };
    if (category) {
      filter.category = new Types.ObjectId(category);
    }

    const [items, total] = await Promise.all([
      this.productModel
        .find(filter)
        .populate("category")
        .populate({
          path: "shopId",
          select: "_id title image address description ownerId banner",
        })
        .populate({
          path: "ownerId",
          select: "_id name image address phone",
        })
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .lean()
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
      ...item,
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
}