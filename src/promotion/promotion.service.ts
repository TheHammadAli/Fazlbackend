import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { FilterQuery, Model, Types } from 'mongoose';
import { Promotion, PromotionDocument } from './schema/promotion-schema';
import { CreatePromotionDto } from './dto/create-promotion.dto';
import { UpdatePromotionDto } from './dto/update-promotion.dto';
import { ProductDocument } from 'src/products/schema/product.schema';

@Injectable()
export class PromotionService {
  constructor(
    @InjectModel(Promotion.name)
    private readonly promotionModel: Model<PromotionDocument>,
  ) { }

  async create(dto: CreatePromotionDto): Promise<Promotion> {
    // Validate targetType
    if (!['Product', 'Shop'].includes(dto.targetType)) {
      throw new BadRequestException('Invalid targetType');
    }
    return this.promotionModel.create(dto);
  }

  async findAll(): Promise<Promotion[]> {
    return this.promotionModel.find().sort({ createdAt: -1 }).exec();
  }

  async findById(id: string): Promise<Promotion> {
    if (!Types.ObjectId.isValid(id)) throw new BadRequestException('Invalid promotion ID');
    const promo = await this.promotionModel.findById(id);
    if (!promo) throw new NotFoundException('Promotion not found');
    return promo;
  }

  async update(id: string, dto: UpdatePromotionDto): Promise<Promotion> {
    if (!Types.ObjectId.isValid(id)) throw new BadRequestException('Invalid promotion ID');
    const updated = await this.promotionModel.findByIdAndUpdate(id, dto, { new: true });
    if (!updated) throw new NotFoundException('Promotion not found');
    return updated;
  }

  async delete(id: string): Promise<void> {
    if (!Types.ObjectId.isValid(id)) throw new BadRequestException('Invalid promotion ID');
    const result = await this.promotionModel.findByIdAndDelete(id);
    if (!result) throw new NotFoundException('Promotion not found');
  }

  async getFeedPromotions(): Promise<Promotion[]> {
    return this.promotionModel.find({ isInFeed: true }).sort({ createdAt: -1 }).exec();
  }

  async getActivePromotionProductIds(): Promise<string[]> {
    const now = new Date();

    const startOfDay = new Date(now);
    startOfDay.setUTCHours(0, 0, 0, 0);

    const endOfDay = new Date(now);
    endOfDay.setUTCHours(23, 59, 59, 999);

    const promotions = await this.promotionModel.find({
      startDate: { $lte: endOfDay },
      endDate: { $gte: startOfDay },

    }).lean();

    return promotions.map(p => p.targetId.toString());
  }


}