import { ShopService } from './shop.service';
import { CreateUpdateShopDto } from './dto/create-update-shop.dto';
import { Request } from 'express';
import { JwtPayload } from 'src/auth/strategies/jwt-strategy';
export declare class ShopController {
    private readonly shopService;
    constructor(shopService: ShopService);
    createShop(dto: CreateUpdateShopDto, req: Request): Promise<import("./schema/shop.schema").Shop>;
    updateShop(id: string, dto: CreateUpdateShopDto): Promise<import("./schema/shop.schema").Shop>;
    getShop(id: string): Promise<import("./schema/shop.schema").ShopDocument>;
    getMyShops(user: JwtPayload): Promise<import("./schema/shop.schema").Shop[]>;
}
