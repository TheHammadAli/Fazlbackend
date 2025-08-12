import { Model } from 'mongoose';
import { Promotion, PromotionDocument } from './schema/promotion-schema';
import { CreatePromotionDto } from './dto/create-promotion.dto';
import { UpdatePromotionDto } from './dto/update-promotion.dto';
export declare class PromotionService {
    private readonly promotionModel;
    constructor(promotionModel: Model<PromotionDocument>);
    create(dto: CreatePromotionDto): Promise<Promotion>;
    findAll(): Promise<Promotion[]>;
    findById(id: string): Promise<Promotion>;
    update(id: string, dto: UpdatePromotionDto): Promise<Promotion>;
    delete(id: string): Promise<void>;
    getFeedPromotions(): Promise<Promotion[]>;
    getActivePromotionProductIds(): Promise<string[]>;
}
