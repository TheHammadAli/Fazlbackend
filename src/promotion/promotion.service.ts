import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from "@nestjs/common";
import { InjectModel } from "@nestjs/mongoose";
import { FilterQuery, Model, Types } from "mongoose";
import { I18nService } from "nestjs-i18n";
import { Promotion, PromotionDocument } from "./schema/promotion-schema";
import { CreatePromotionDto } from "./dto/create-promotion.dto";
import { UpdatePromotionDto } from "./dto/update-promotion.dto";
import { ProductDocument } from "src/products/schema/product.schema";

@Injectable()
export class PromotionService {
  constructor(
    @InjectModel(Promotion.name)
    private readonly promotionModel: Model<PromotionDocument>,
    private readonly i18n: I18nService,
  ) {}

  async create(
    dto: CreatePromotionDto,
    lang: string = "en",
  ): Promise<Promotion> {
    // Validate targetType
    if (!["Product", "Shop"].includes(dto.targetType)) {
      throw new BadRequestException(
        this.i18n.translate("promotion.invalid_target_type", { lang }),
      );
    }
    return this.promotionModel.create(dto);
  }

  async findAll(): Promise<Promotion[]> {
    return this.promotionModel.find().sort({ createdAt: -1 }).exec();
  }

  async findById(id: string, lang: string = "en"): Promise<Promotion> {
    if (!Types.ObjectId.isValid(id))
      throw new BadRequestException(
        this.i18n.translate("promotion.invalid_promotion_id", { lang }),
      );
    const promo = await this.promotionModel.findById(id);
    if (!promo)
      throw new NotFoundException(
        this.i18n.translate("promotion.promotion_not_found", { lang }),
      );
    return promo;
  }

  async update(
    id: string,
    dto: UpdatePromotionDto,
    lang: string = "en",
  ): Promise<Promotion> {
    if (!Types.ObjectId.isValid(id))
      throw new BadRequestException(
        this.i18n.translate("promotion.invalid_promotion_id", { lang }),
      );
    const updated = await this.promotionModel.findByIdAndUpdate(id, dto, {
      new: true,
    });
    if (!updated)
      throw new NotFoundException(
        this.i18n.translate("promotion.promotion_not_found", { lang }),
      );
    return updated;
  }

  async delete(id: string, lang: string = "en"): Promise<void> {
    if (!Types.ObjectId.isValid(id))
      throw new BadRequestException(
        this.i18n.translate("promotion.invalid_promotion_id", { lang }),
      );
    const result = await this.promotionModel.findByIdAndDelete(id);
    if (!result)
      throw new NotFoundException(
        this.i18n.translate("promotion.promotion_not_found", { lang }),
      );
  }

  async getFeedPromotions(): Promise<Promotion[]> {
    return this.promotionModel
      .find({ isInFeed: true })
      .sort({ createdAt: -1 })
      .exec();
  }

  async getActivePromotionProductIds(): Promise<string[]> {
    const now = new Date();

    const startOfDay = new Date(now);
    startOfDay.setUTCHours(0, 0, 0, 0);

    const endOfDay = new Date(now);
    endOfDay.setUTCHours(23, 59, 59, 999);

    const promotions = await this.promotionModel
      .find({
        startDate: { $lte: endOfDay },
        endDate: { $gte: startOfDay },
      })
      .lean();

    return promotions.map((p) => p.targetId.toString());
  }
}
