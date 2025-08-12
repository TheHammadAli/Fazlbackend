import { Model, Types } from 'mongoose';
import { Shop, ShopDocument } from './schema/shop.schema';
import { CreateUpdateShopDto } from './dto/create-update-shop.dto';
import { ProductsService } from 'src/products/products.service';
import { ServicesService } from 'src/services/services.service';
export declare class ShopService {
    private shopModel;
    private readonly productsService;
    private readonly servicesService;
    constructor(shopModel: Model<ShopDocument>, productsService: ProductsService, servicesService: ServicesService);
    createShop(ownerId: Types.ObjectId, dto: CreateUpdateShopDto): Promise<Shop>;
    updateShop(shopId: string, dto: CreateUpdateShopDto): Promise<Shop>;
    getShopById(shopId: string): Promise<ShopDocument>;
    getAllShopsByUser(userId: string): Promise<Shop[]>;
    findShopsNearLocation(location: [number, number], radiusInMeters: number): Promise<Shop[]>;
}
