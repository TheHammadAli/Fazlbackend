import { PromotionService } from './promotion.service';
import { CreatePromotionDto } from './dto/create-promotion.dto';
import { UpdatePromotionDto } from './dto/update-promotion.dto';
import { Promotion } from './schema/promotion-schema';
export declare class PromotionController {
    private readonly promotionService;
    constructor(promotionService: PromotionService);
    create(dto: CreatePromotionDto): Promise<Promotion>;
    findAll(): Promise<Promotion[]>;
    findById(id: string): Promise<Promotion>;
    update(id: string, dto: UpdatePromotionDto): Promise<Promotion>;
    delete(id: string): Promise<void>;
}
