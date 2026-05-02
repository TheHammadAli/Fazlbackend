import { ShopService } from "./shop.service";
import { CreateUpdateShopDto } from "./dto/create-update-shop.dto";
import { Request } from "express";
import { JwtPayload } from "src/auth/strategies/jwt-strategy";
export declare class ShopController {
    private readonly shopService;
    constructor(shopService: ShopService);
    createShop(dto: CreateUpdateShopDto, req: Request, files: {
        image?: Express.Multer.File[];
    }): Promise<{
        message: string;
        data: import("mongoose").Document<unknown, {}, import("./schema/shop.schema").ShopDocument, {}> & import("./schema/shop.schema").Shop & import("mongoose").Document<unknown, any, any, Record<string, any>> & Required<{
            _id: unknown;
        }> & {
            __v: number;
        };
    }>;
    updateShop(id: string, dto: CreateUpdateShopDto, files: {
        image?: Express.Multer.File[];
    }): Promise<import("./schema/shop.schema").Shop>;
    getShop(id: string): Promise<import("./schema/shop.schema").ShopDocument>;
    getMyShops(user: JwtPayload): Promise<import("./schema/shop.schema").Shop[]>;
}
