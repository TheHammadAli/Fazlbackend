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

@Injectable()
export class ShopService {
  constructor(
    @InjectModel(Shop.name) private shopModel: Model<ShopDocument>,
    @Inject(forwardRef(() => ProductsService))
    private readonly productsService: ProductsService,

    @Inject(forwardRef(() => ServicesService))
    private readonly servicesService: ServicesService,
  ) {}

  async createShop(
    ownerId: Types.ObjectId,
    dto: CreateUpdateShopDto,
  ): Promise<Shop> {
    const shop = new this.shopModel({
      ...dto,
      ownerId,
    });

    return shop.save();
  }

  async updateShop(shopId: string, dto: CreateUpdateShopDto): Promise<Shop> {
    const { ownerId, ...safeDto } = dto as any;
    const updated = await this.shopModel.findByIdAndUpdate(
      shopId,
      { ...safeDto },
      { new: true },
    );

    if (dto.location) {
    
        this.productsService.updateLocationByShopId(shopId, dto.location);
      
    }
    if (!updated) {
      throw new NotFoundException('Shop not found');
    }
    return updated;
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
