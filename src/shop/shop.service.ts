import {
  forwardRef,
  Inject,
  Injectable,
  NotFoundException,
} from "@nestjs/common";
import { InjectModel } from "@nestjs/mongoose";
import { Model, Types } from "mongoose";
import { I18nService } from "nestjs-i18n";
import { Shop, ShopDocument } from "./schema/shop.schema";
import { CreateUpdateShopDto } from "./dto/create-update-shop.dto";
import { ProductsService } from "src/products/products.service";
import { ServicesService } from "src/services/services.service";
import { UsersService } from "src/users/users.service";
import { FileUploadService } from "src/common/file-upload/file-upload.service";
import { ClsService } from "nestjs-cls";

@Injectable()
export class ShopService {
  constructor(
    @InjectModel(Shop.name) private shopModel: Model<ShopDocument>,
    @Inject(forwardRef(() => ProductsService))
    private readonly productsService: ProductsService,
    private readonly usersService: UsersService,
    private readonly fileUploadService: FileUploadService,
    @Inject(forwardRef(() => ServicesService))
    private readonly servicesService: ServicesService,
    private readonly i18n: I18nService,
    private readonly cls: ClsService,
  ) {}
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
    let image: Express.Multer.File = {} as Express.Multer.File;
    if (dto.image) {
      image = dto.image;
      dto.image = "default-shop.png"; // Default image if none provided
    }
    const shop = new this.shopModel({
      ...dto,
      ownerId,
    });

    const results = await shop.save();
    if (dto.image) {
      const imageUrl = await this.fileUploadService.uploadShopImage(
        results._id as string,
        image,
      );
      results.image = imageUrl; // Ensure the image is stored as a filename
    }
    const shopResult = await results.save(); // Save the shop again to update the image field
    return {
      message: this.i18n.translate("auth.shop.created_success", {
        lang: this.lang,
      }),
      data: shopResult,
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
      const imageUrl = await this.fileUploadService.uploadShopImage(
        shopId,
        dto.image,
      );
      safeDto.image = imageUrl; // Ensure the image is stored as a filename}
    }
    const updated = await this.shopModel.findByIdAndUpdate(shopId, {
      ...safeDto,
    });

    if (dto.location) {
      this.productsService.updateLocationByShopId(shopId, dto.location);
    }
    if (!updated) {
      throw new NotFoundException(
        this.i18n.translate("auth.shop.shop_not_found", { lang: this.lang }),
      );
    }
    return {message: this.i18n.translate("auth.shop.updated_success", { lang: this.lang }), data: updated.toJSON() };
  }

  async getShopById(shopId: string): Promise<ShopDocument> {
    const shop = await this.shopModel
      .findById(shopId)
      .populate("ownerId", "name email");
    if (!shop) {
      throw new NotFoundException(
        this.i18n.translate("auth.shop.shop_not_found", { lang: this.lang }),
      );
    }
    return shop;
  }
  async getAllShopsByUser(userId: string): Promise<Shop[]> {
    return this.shopModel.find({ ownerId: new Types.ObjectId(userId) }).exec();
  }
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
    });
  }
}
