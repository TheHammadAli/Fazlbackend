import { Model, Types } from 'mongoose';
import { Like, LikeDocument } from './schema/like.schema';
import { CreateLikeDto, RemoveLikeDto } from './dto/like.dto';
import { ProductsService } from 'src/products/products.service';
import { ServicesService } from 'src/services/services.service';
import { I18nService } from 'nestjs-i18n';
import { ClsService } from 'nestjs-cls';
export interface LikeItem {
    _id: Types.ObjectId;
    itemId: Types.ObjectId;
    itemType: 'product' | 'service';
    ownerModel: 'Shop' | 'User';
    createdAt: Date;
}
export interface PopulatedLikeItem extends LikeItem {
    itemDetails?: any;
}
export declare class LikeService {
    private likeModel;
    private readonly productsService;
    private readonly servicesService;
    private readonly i18n;
    private readonly cls;
    constructor(likeModel: Model<LikeDocument>, productsService: ProductsService, servicesService: ServicesService, i18n: I18nService, cls: ClsService);
    private get lang();
    addLike(userId: string, dto: CreateLikeDto): Promise<Like>;
    removeLike(userId: string, dto: RemoveLikeDto): Promise<{
        message: string;
    }>;
    getLikesByUser(userId: string, itemType?: 'product' | 'service'): Promise<PopulatedLikeItem[]>;
    isLiked(userId: string, itemId: string, itemType: 'product' | 'service'): Promise<boolean>;
    getLikeCount(itemId: string, itemType: 'product' | 'service'): Promise<number>;
    private validateItemExists;
}
