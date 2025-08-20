import { Model, Types } from 'mongoose';
import { Shop, ShopDocument } from './schema/shop.schema';
import { CreateUpdateShopDto } from './dto/create-update-shop.dto';
import { ProductsService } from 'src/products/products.service';
import { ServicesService } from 'src/services/services.service';
import { UsersService } from 'src/users/users.service';
import { FileUploadService } from 'src/common/file-upload/file-upload.service';
export declare class ShopService {
    private shopModel;
    private readonly productsService;
    private readonly usersService;
    private readonly fileUploadService;
    private readonly servicesService;
    constructor(shopModel: Model<ShopDocument>, productsService: ProductsService, usersService: UsersService, fileUploadService: FileUploadService, servicesService: ServicesService);
    createShop(ownerId: Types.ObjectId, dto: CreateUpdateShopDto): Promise<import("mongoose").FlattenMaps<Shop & import("mongoose").Document<unknown, any, any, Record<string, any>> & Required<{
        _id: unknown;
    }> & {
        __v: number;
    }>>;
    updateShop(shopId: string, dto: CreateUpdateShopDto): Promise<Shop>;
    getShopById(shopId: string): Promise<ShopDocument>;
    getAllShopsByUser(userId: string): Promise<Shop[]>;
    findShopsNearLocation(location: [number, number], radiusInMeters: number): Promise<Shop[]>;
}
