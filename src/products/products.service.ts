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
    private readonly shopService: ShopService,
    private readonly listingUtils: ListingUtilsService,
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

  async create(
    entityId: string,
    type: "shop" | "personal",
    dto: CreateProductDto,
  ): Promise<{ message: string; data: { product: Product } }> {
    try {
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
        console.log("User:", user);
        productPayload.ownerId = user._id as Types.ObjectId;
        if (
          !user.location ||
          !user.location.coordinates ||
          user.location.coordinates.length !== 2
        ) {
          throw new BadRequestException(
            this.i18n.translate("auth.products.user_location_missing", {
              lang: this.lang,
            }),
          );
        }

        location = {
          type: "Point",
          coordinates: user.location.coordinates,
        };
      } else {
        throw new BadRequestException(
          'Invalid type. Must be "shop" or "personal".',
        );
      }
      console.log("Product Payload:", productPayload);
      const createdProduct = new this.productModel({
        ...productPayload,
        location,
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
        createdProduct.video = uploadedVideo[0].url; // Assuming only one video is uploaded
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
        .find({ shopId: new Types.ObjectId(shopId), isDeleted: false })
        .populate("category")
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit),
      this.productModel.countDocuments({ shopId, isDeleted: false }),
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
        .find({ ownerId: new Types.ObjectId(ownerId) ,isDeleted: false })
        .populate("category")
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit),
      this.productModel.countDocuments({ ownerId, isDeleted: false }),
    ]);

    return {
      meta: { total, page, limit, totalPages: Math.ceil(total / limit) },
      data: items,
    };
  }

  async getById(id: string): Promise<Product> {
    const product = await this.productModel
      .findOne({ _id: new Types.ObjectId(id), isDeleted: false })
      .populate("category");
    if (!product)
      throw new NotFoundException(
        this.i18n.translate("auth.products.product_not_found", {
          lang: this.lang,
        }),
      );
    return product;
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
    Object.keys(updateDto).forEach((key) => {
      if (
        updateDto[key] === "" || // empty string
        updateDto[key] === null || // null
        typeof updateDto[key] === "undefined"
      ) {
        delete updateDto[key]; // remove it from updateData
      }
    });

    const existingProduct = await this.productModel.findOne({ _id: new Types.ObjectId(productId), isDeleted: false });
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
        existingProduct.shopId.toString(),
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
        existingProduct.shopId.toString(),
        productId,
        "video",
      );

      console.log("Uploaded Video:", uploadedVideo);
      updateDto.video = uploadedVideo[0].url; // Assuming only one video is uploaded
    }

    const updated = await this.productModel
      .findOneAndUpdate({ _id: new Types.ObjectId(productId), isDeleted: false }, updateDto, { new: true })
      .exec();

    if (!updated) {
      throw new NotFoundException(
        this.i18n.translate("auth.products.product_not_found", {
          lang: this.lang,
        }),
      );
    }

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
    const existingProduct = await this.productModel.findOne({ _id: new Types.ObjectId(productId), isDeleted: false });
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
    const result = await this.productModel.findByIdAndUpdate(new Types.ObjectId(productId), { isDeleted: true });
    if (!result)
      throw new NotFoundException(
        this.i18n.translate("auth.products.product_not_found", {
          lang: this.lang,
        }),
      );
  }

  async deleteProductMedia(productId: string, media: string[]) {
    const existingProduct = await this.productModel.findOne({ _id: new Types.ObjectId(productId), isDeleted: false });
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

  async updateLocationByShopId(
    shopId: string,
    location: { type: "Point"; coordinates: [number, number] },
  ) {
    await this.productModel.updateMany({ shopId }, { $set: { location } });
  }

  async searchProducts(query: SearchAllProductsServiceDto) {
    const productSearchFilter: FilterQuery<ProductDocument> = {};

    // Apply full search filter for regular items
    if (query.name) {
      productSearchFilter.title = { $regex: query.name, $options: "i" };
    }

    if (query.category) {
      productSearchFilter.category = new Types.ObjectId(query.category);
    }

    // Pagination
    const page = query.page && query.page > 0 ? query.page : 1;
    const limit = query.limit && query.limit > 0 ? query.limit : 10;
    const skip = (page - 1) * limit;

    // Query the database
    const allPromotedIds =
      await this.promotionService.getActivePromotionProductIds();
    console.log("Active Promotion Product IDs:", allPromotedIds);
    // Apply relaxed filter (e.g., only by category) for promotions
    const promotionFilter: FilterQuery<ProductDocument> = {};
    if (query.category) {
      promotionFilter.category = new Types.ObjectId(query.category);
    }
    promotionFilter.isDeleted = false; // Ensure we only get non-deleted products for promotions

    // Fetch promoted products (that match category if provided)
    const promotedProducts = await this.productModel
      .find({
        _id: { $in: allPromotedIds },
        ...promotionFilter,
      })
      .sort({ createdAt: -1 })
      .lean()
      .exec();

    const promotedProductIds = promotedProducts.map((p: any) =>
      new Types.ObjectId(p._id).toString(),
    );

    // Regular products filter, excluding promoted ones
    const filteredProductSearchFilter: FilterQuery<ProductDocument> = {
      ...productSearchFilter,
      _id: { $nin: promotedProductIds },
      isDeleted: false,
    };

    const [regularProducts, total] = await Promise.all([
      this.productModel
        .find(filteredProductSearchFilter)
        .skip(skip)
        .limit(limit)
        .lean()
        .exec(),
      this.productModel.countDocuments(filteredProductSearchFilter),
    ]);

    const enrichedPromotions = await this.enrichProductsWithReviewStats(
      promotedProducts,
    );
    const enrichedRegularProducts = await this.enrichProductsWithReviewStats(
      regularProducts,
    );

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
    userId: string,
    category?: string,
  ): Promise<PaginatedResponseDto<any>> {
    const { page = 1, limit = 10 } = paginationDto;
    const skip = (page - 1) * limit;

    const filter : FilterQuery<ProductDocument> = {
      video: { $exists: true, $nin: ["", null] },
    };
    if (category) {
      filter.category = new Types.ObjectId(category)
    }

    const [items, total] = await Promise.all([
      this.productModel
        .find(filter)
        .populate("category") // you can also populate shopId or ownerId if needed
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .lean() // ← This is the key fix
        .exec(),

      this.productModel.countDocuments(filter).exec(),
    ]);

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
}
