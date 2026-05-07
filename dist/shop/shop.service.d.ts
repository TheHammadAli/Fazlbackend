import { Model, Types } from "mongoose";
import { I18nService } from "nestjs-i18n";
import { Shop, ShopDocument } from "./schema/shop.schema";
import { CreateUpdateShopDto } from "./dto/create-update-shop.dto";
import { ProductsService } from "src/products/products.service";
import { ServicesService } from "src/services/services.service";
import { UsersService } from "src/users/users.service";
import { FileUploadService } from "src/common/file-upload/file-upload.service";
import { ClsService } from "nestjs-cls";
export declare class ShopService {
    private shopModel;
    private readonly productsService;
    private readonly usersService;
    private readonly fileUploadService;
    private readonly servicesService;
    private readonly i18n;
    private readonly cls;
    constructor(shopModel: Model<ShopDocument>, productsService: ProductsService, usersService: UsersService, fileUploadService: FileUploadService, servicesService: ServicesService, i18n: I18nService, cls: ClsService);
    private get lang();
    createShop(ownerId: Types.ObjectId, dto: CreateUpdateShopDto): Promise<{
        message: string;
        data: import("mongoose").Document<unknown, {}, ShopDocument, {}> & Shop & import("mongoose").Document<unknown, any, any, Record<string, any>> & Required<{
            _id: unknown;
        }> & {
            __v: number;
        };
    }>;
    updateShop(shopId: string, dto: CreateUpdateShopDto): Promise<{
        message: string;
        data: Shop;
    }>;
    getShopById(shopId: string): Promise<ShopDocument>;
    getAllShopsByUser(userId: string): Promise<Shop[]>;
    findShopsNearLocation(location: [number, number], radiusInMeters: number): Promise<Shop[]>;
}
