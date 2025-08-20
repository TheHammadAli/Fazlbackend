import {
  forwardRef,
  Inject,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { Shop, ShopDocument } from './schema/shop.schema';
import { CreateUpdateShopDto } from './dto/create-update-shop.dto';
import { ProductsService } from 'src/products/products.service';
import { ServicesService } from 'src/services/services.service';
import { UsersService } from 'src/users/users.service';
import { FileUploadService } from 'src/common/file-upload/file-upload.service';

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
  ) { }

  async createShop(
    ownerId: Types.ObjectId,
    dto: CreateUpdateShopDto,
  ) {

    const existingUser = await this.usersService.findUserById(ownerId.toString());
    if (!existingUser) {
      throw new NotFoundException('User not found');
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
      const imageUrl = await this.fileUploadService.uploadShopImage(results._id as unknown as string, image);
      results.image = imageUrl; // Ensure the image is stored as a filename
    }
    await results.save(); // Save the shop again to update the image field
    return results.toJSON();
  }

  async updateShop(shopId: string, dto: CreateUpdateShopDto): Promise<Shop> {
    const { ...safeDto } = dto as any;
    const existingShop = await this.shopModel.findById(shopId);
    if (!existingShop) {
      throw new NotFoundException('Shop not found');
    }

    if (dto.image) {
      const imageUrl = await this.fileUploadService.uploadShopImage(shopId, dto.image)
      safeDto.image = imageUrl; // Ensure the image is stored as a filename}
    }
    const updated = await this.shopModel.findByIdAndUpdate(
      shopId,
      { ...safeDto },
    );

    if (dto.location) {
      this.productsService.updateLocationByShopId(shopId, dto.location);
    }
    if (!updated) {
      throw new NotFoundException('Shop not found');
    }
    return safeDto;
  }

  async getShopById(shopId: string): Promise<ShopDocument> {
    const shop = await this.shopModel.findById(shopId);
    if (!shop) {
      throw new NotFoundException('Shop not found');
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
            type: 'Point',
            coordinates: location,
          },
          $maxDistance: radiusInMeters,
        },
      },
    });
  }
}
