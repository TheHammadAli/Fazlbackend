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
import { CreateUpdateShopDto } from "./dto/create-update-shop.dto";
import { ProductsService } from "src/products/products.service";
import { ServicesService } from "src/services/services.service";
import { UsersService } from "src/users/users.service";
import { FileUploadService } from "src/common/file-upload/file-upload.service";
import { ClsService } from "nestjs-cls";
import { OrdersService } from "src/orders/orders.service";

@Injectable()
export class ShopService {
  constructor(
    @InjectModel(Shop.name) private shopModel: Model<ShopDocument>,
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
    const shop = new this.shopModel({
      ...shopDto,
      ownerId,
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

  async updateShop(shopId: string, dto: CreateUpdateShopDto): Promise<{ message: string; data: Shop }> {
    const { ...safeDto } = dto as any;
    const existingShop = await this.shopModel.findById(shopId);
    if (!existingShop) {
      throw new NotFoundException(
        this.i18n.translate("auth.shop.shop_not_found", { lang: this.lang }),
      );
    }

    if (dto.image) {
      safeDto.image = await this.fileUploadService.uploadShopImage(
        shopId,
        dto.image,
      );
    }
    if (dto.banner) {
      safeDto.banner = await this.fileUploadService.uploadShopBanner(
        shopId,
        dto.banner,
      );
    }
    const updated = await this.shopModel.findByIdAndUpdate(shopId, {
      ...safeDto,
    }, { new: true });

    if (dto.location) {
      this.productsService.updateLocationByShopId(shopId, dto.location);
    }
    if (!updated) {
      throw new NotFoundException(
        this.i18n.translate("auth.shop.shop_not_found", { lang: this.lang }),
      );
    }
    return { message: this.i18n.translate("auth.shop.updated_success", { lang: this.lang }), data: updated.toJSON() };
  }

  async getShopById(shopId: string) {
    const shop = await this.shopModel
      .findById(shopId)
      .populate("ownerId", "name email");


    if (!shop) {
      throw new NotFoundException(
        this.i18n.translate("auth.shop.shop_not_found", { lang: this.lang }),
      );
    }
    const productsCount = await this.productsService.getAllProductsByShop(shopId, { page: 1, limit: 1 });
    const ordersCount = await this.ordersService.getOrdersByOwner(shopId, "Shop", 1, 1);

    return { ...shop.toJSON(), productsCount: productsCount.meta.total, ordersCount: ordersCount.meta.total };
  }
  async getAllShopsByUser(userId: string): Promise<Shop[]> {
    return this.shopModel.find({ ownerId: new Types.ObjectId(userId) }).exec();
  }

  async setShopDisabled(shopId: string, disabled: boolean) {
    await this.shopModel.findByIdAndUpdate(shopId, { $set: { isDisabled: disabled } });
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

    const query: Record<string, any> = { isDeleted: false };

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
      meta: { total, page, limit, totalPages: Math.ceil(total / limit) },
      data,
    };
  }
}
