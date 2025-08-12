import {
  Injectable,
  NotFoundException,
  InternalServerErrorException,
  ForbiddenException,
  BadRequestException,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { FilterQuery, Model, Types } from 'mongoose';
import { Product, ProductDocument } from './schema/product.schema';
import { CreateProductDto } from './dto/create-product.dto';
import { UpdateProductDto } from './dto/update-product.dto';
import { PaginationDto } from 'src/common/dto/pagination.dto';
import { PaginatedResponseDto } from 'src/common/dto/pagination-response.dto';
import { ShopService } from 'src/shop/shop.service';
import { ListingUtilsService } from 'src/shared/listing-util-service';
import { UsersService } from 'src/users/users.service';
import { SearchAllProductsServiceDto } from 'src/search/dto/product-service-search-for.dto';
import { FileUploadService } from 'src/common/file-upload/file-upload.service';
import { PromotionService } from 'src/promotion/promotion.service';

@Injectable()
export class ProductsService {
  constructor(
    @InjectModel(Product.name)
    private readonly productModel: Model<ProductDocument>,
    private readonly shopService: ShopService,
    private readonly listingUtils: ListingUtilsService,
    private readonly userService: UsersService,
    private readonly fileUploadService: FileUploadService,
    private promotionService: PromotionService

  ) { }

  async create(
    entityId: string,
    type: 'shop' | 'personal',
    dto: CreateProductDto,
    files: { images?: Express.Multer.File[], video?: Express.Multer.File[] }
  ): Promise<Product> {
    try {
      let location: { type: 'Point'; coordinates: [number, number] };
      const productPayload: Partial<Product> = {
        ...dto,
        category: new Types.ObjectId(dto.category),

      };

      if (type === 'shop') {
        const shop = await this.shopService.getShopById(entityId);
        if (!shop) {
          throw new NotFoundException('Shop not found');
        }

        if (
          !shop.location ||
          !shop.location.coordinates ||
          shop.location.coordinates.length !== 2
        ) {
          throw new BadRequestException('Shop location is missing');
        }

        productPayload.shopId = shop._id as Types.ObjectId;
        location = shop.location;
      } else if (type === 'personal') {
        const user = await this.userService.findUserById(entityId);
        if (!user) {
          throw new NotFoundException('User not found');
        }
        console.log('User:', user);
        productPayload.ownerId = user._id as Types.ObjectId;
        if (
          !user.location ||
          !user.location.coordinates ||
          user.location.coordinates.length !== 2
        ) {
          throw new BadRequestException('User location is missing');
        }

        location = {
          type: 'Point',
          coordinates: user.location.coordinates,
        };
      } else {
        throw new BadRequestException('Invalid type. Must be "shop" or "personal".');
      }
      console.log('Product Payload:', productPayload);
      const createdProduct = new this.productModel({
        ...productPayload,
        location,
        category: new Types.ObjectId(dto.category),
      });
      let imageUrls: string[] = [];
      if (files?.images?.length) {
        const uploadedFiles = await this.fileUploadService.uploadProductFiles(files.images, type, entityId, (createdProduct._id as Types.ObjectId).toString(), 'images');
        imageUrls = uploadedFiles.map(file => file.url);
        createdProduct.imageUrls = imageUrls;
      }

      if (files?.video?.length) {
        const uploadedVideo = await this.fileUploadService.uploadProductFiles(files.video, type, entityId, (createdProduct._id as Types.ObjectId).toString(), 'video');
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
        .find({ shopId })
        .populate('category')
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

    const [items, total] = await Promise.all([
      this.productModel
        .find({ ownerId })
        .populate('category')
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

  async getById(id: string): Promise<Product> {
    const product = await this.productModel.findById(new Types.ObjectId(id)).populate('category');
    if (!product) throw new NotFoundException('Product not found');
    return product;
  }

  async update(
    productId: string,
    updateDto: UpdateProductDto,
  ): Promise<Product> {
    if ('shopId' in updateDto) {
      throw new ForbiddenException('shopId cannot be updated');
    }
    if (updateDto.category) {
      (updateDto as any).category = new Types.ObjectId(updateDto.category);
    }

    const updated = await this.productModel
      .findByIdAndUpdate(productId, updateDto, { new: true })
      .exec();

    if (!updated) {
      throw new NotFoundException('Product not found');
    }

    return updated;
  }

  async delete(productId: string): Promise<void> {
    const result = await this.productModel.findByIdAndDelete(productId);
    if (!result) throw new NotFoundException('Product not found');
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
    location: { type: 'Point'; coordinates: [number, number] },
  ) {
    await this.productModel.updateMany({ shopId }, { $set: { location } });
  }


  async searchProducts(query: SearchAllProductsServiceDto) {
    const productSearchFilter: FilterQuery<ProductDocument> = {};

    // Apply full search filter for regular items
    if (query.name) {
      productSearchFilter.title = { $regex: query.name, $options: 'i' };
    }

    if (query.category) {
      productSearchFilter.category = new Types.ObjectId(query.category);
    }

    // Pagination
    const page = query.page && query.page > 0 ? query.page : 1;
    const limit = query.limit && query.limit > 0 ? query.limit : 10;
    const skip = (page - 1) * limit;

    // Query the database
    const allPromotedIds = await this.promotionService.getActivePromotionProductIds();
    console.log('Active Promotion Product IDs:', allPromotedIds);
    // Apply relaxed filter (e.g., only by category) for promotions
    const promotionFilter: FilterQuery<ProductDocument> = {};
    if (query.category) {
      promotionFilter.category = new Types.ObjectId(query.category);
    }

    // Fetch promoted products (that match category if provided)
    const promotedProducts = await this.productModel.find({
      _id: { $in: allPromotedIds },
      ...promotionFilter,
    }).exec();

    const promotedProductIds = promotedProducts.map((p: ProductDocument) => (p._id as Types.ObjectId).toString());

    // Regular products filter, excluding promoted ones
    const filteredProductSearchFilter: FilterQuery<ProductDocument> = {
      ...productSearchFilter,
      _id: { $nin: promotedProductIds },
    };

    const [regularProducts, total] = await Promise.all([
      this.productModel.find(filteredProductSearchFilter).skip(skip).limit(limit).exec(),
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
}
