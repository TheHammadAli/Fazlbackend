import {
  Injectable,
  NotFoundException,
  InternalServerErrorException,
  ForbiddenException,
  BadRequestException,
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
  ) { }

  async create(
    entityId: string,
    type: "shop" | "personal",
    dto: CreateProductDto,
    userId: string,
    lang: string = "en",
  ): Promise<Product> {
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
            this.i18n.translate("auth.products.shop_not_found", { lang }),
          );
        }

        if (
          !shop.location ||
          !shop.location.coordinates ||
          shop.location.coordinates.length !== 2
        ) {
          throw new BadRequestException(
            this.i18n.translate("auth.products.shop_location_missing", { lang }),
          );
        }

        productPayload.shopId = shop._id as Types.ObjectId;
        location = shop.location;
        console.log("product payload", productPayload);
      } else if (type === "personal") {
        const user = await this.userService.findUserById(entityId);
        if (!user) {
          throw new NotFoundException(
            this.i18n.translate("auth.products.user_not_found", { lang }),
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
            this.i18n.translate("auth.products.user_location_missing", { lang }),
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

      return await createdProduct.save();
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
        .find({ shopId: new Types.ObjectId(shopId) })
        .populate("category")
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit),
      this.productModel.countDocuments({ shopId }),
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
        .find({ ownerId: new Types.ObjectId(ownerId) })
        .populate("category")
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit),
      this.productModel.countDocuments({ ownerId }),
    ]);

    return {
      meta: { total, page, limit, totalPages: Math.ceil(total / limit) },
      data: items,
    };
  }

  async getById(id: string, lang: string = "en"): Promise<Product> {
    const product = await this.productModel
      .findById(new Types.ObjectId(id))
      .populate("category");
    if (!product)
      throw new NotFoundException(
        this.i18n.translate("auth.products.product_not_found", { lang }),
      );
    return product;
  }

  async update(
    productId: string,
    updateDto: UpdateProductDto,
    lang: string = "en",
  ): Promise<Product> {
    if ("shopId" in updateDto) {
      throw new ForbiddenException(
        this.i18n.translate("auth.products.shop_cant_update", { lang }),
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

    const existingProduct = await this.productModel.findById(productId);
    if (!existingProduct) {
      throw new NotFoundException(
        this.i18n.translate("auth.products.product_not_found", { lang }),
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
      let newImages = uploadedFiles.map((file) => file.url);
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
      .findByIdAndUpdate(productId, updateDto, { new: true })
      .exec();

    if (!updated) {
      throw new NotFoundException(
        this.i18n.translate("auth.products.product_not_found", { lang }),
      );
    }

    return updated;
  }

  async delete(productId: string, lang: string = "en"): Promise<void> {
    const existingProduct = await this.productModel.findById(productId);
    if (!existingProduct) {
      throw new NotFoundException(
        this.i18n.translate("auth.products.product_not_found", { lang }),
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
    const result = await this.productModel.findByIdAndDelete(productId);
    if (!result)
      throw new NotFoundException(
        this.i18n.translate("auth.products.product_not_found", { lang }),
      );
  }

  async deleteProductMedia(
    productId: string,
    media: string[],
    lang: string = "en",
  ) {
    const existingProduct = await this.productModel.findById(productId);
    if (!existingProduct) {
      throw new NotFoundException(
        this.i18n.translate("auth.products.product_not_found", { lang }),
      );
    }
    if (!media || media.length === 0) {
      throw new BadRequestException(
        this.i18n.translate("auth.products.no_media_provided", { lang }),
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

    // Fetch promoted products (that match category if provided)
    const promotedProducts = await this.productModel
      .find({
        _id: { $in: allPromotedIds },
        ...promotionFilter,
      })
      .exec();

    const promotedProductIds = promotedProducts.map((p: ProductDocument) =>
      (p._id as Types.ObjectId).toString(),
    );

    // Regular products filter, excluding promoted ones
    const filteredProductSearchFilter: FilterQuery<ProductDocument> = {
      ...productSearchFilter,
      _id: { $nin: promotedProductIds },
    };

    const [regularProducts, total] = await Promise.all([
      this.productModel
        .find(filteredProductSearchFilter)
        .skip(skip)
        .limit(limit)
        .exec(),
      this.productModel.countDocuments(filteredProductSearchFilter),
    ]);

    return {
      data: {
        promotions: promotedProducts,
        items: regularProducts,
      },
      meta: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  async getProductsWithVideos(
    paginationDto: PaginationDto,
  ): Promise<PaginatedResponseDto<Product>> {
    const { page = 1, limit = 10 } = paginationDto;
    const skip = (page - 1) * limit;
    const filter = {
      video: { $exists: true, $nin: ["", null] },
    };

    const [items, total] = await Promise.all([
      this.productModel
        .find(filter)
        .populate("category")
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .exec(),
      this.productModel.countDocuments(filter).exec(),
    ]);

    return {
      meta: { total, page, limit, totalPages: Math.ceil(total / limit) },
      data: items,
    };
  }
}
