import { Model } from "mongoose";
import { I18nService } from "nestjs-i18n";
import { Promotion, PromotionDocument } from "./schema/promotion-schema";
import { CreatePromotionDto } from "./dto/create-promotion.dto";
import { UpdatePromotionDto } from "./dto/update-promotion.dto";
export declare class PromotionService {
    private readonly promotionModel;
    private readonly i18n;
    constructor(promotionModel: Model<PromotionDocument>, i18n: I18nService);
    create(dto: CreatePromotionDto, lang?: string): Promise<Promotion>;
    findAll(): Promise<Promotion[]>;
    findById(id: string, lang?: string): Promise<Promotion>;
    update(id: string, dto: UpdatePromotionDto, lang?: string): Promise<Promotion>;
    delete(id: string, lang?: string): Promise<void>;
    getFeedPromotions(): Promise<Promotion[]>;
    getActivePromotionProductIds(): Promise<string[]>;
}
