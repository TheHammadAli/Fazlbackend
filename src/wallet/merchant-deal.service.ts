import { BadRequestException, Injectable } from "@nestjs/common";
import { InjectModel } from "@nestjs/mongoose";
import { Model, Types } from "mongoose";
import { MerchantDeal, MerchantDealDocument } from "./schema/merchant-deal.schema";
import { UpdateMerchantDealDto } from "./dto/update-merchant-deal.dto";
import { WalletAuditLogService } from "./wallet-audit-log.service";

/** Append-only merchant deal versioning (spec §4). A deal row is never updated in place —
 *  changing terms closes the active row and inserts a new one. merchantDealPercent is
 *  always server-computed (customerDiscountPercent + fazlMarginPercent), never accepted
 *  from the client, so the two can never disagree. */
@Injectable()
export class MerchantDealService {
  constructor(
    @InjectModel(MerchantDeal.name) private readonly dealModel: Model<MerchantDealDocument>,
    private readonly auditLogService: WalletAuditLogService,
  ) {}

  async getCurrentAndHistory(merchantId: string) {
    if (!Types.ObjectId.isValid(merchantId)) throw new BadRequestException("Invalid merchant id");
    const merchantObjectId = new Types.ObjectId(merchantId);

    const [current, history] = await Promise.all([
      this.dealModel.findOne({ merchantId: merchantObjectId, effectiveTo: null }).lean(),
      this.dealModel.find({ merchantId: merchantObjectId }).sort({ createdAt: -1 }).limit(50).lean(),
    ]);

    return { current: current ?? null, history };
  }

  async getActiveDeal(merchantId: string): Promise<MerchantDeal | null> {
    if (!Types.ObjectId.isValid(merchantId)) return null;
    return this.dealModel
      .findOne({ merchantId: new Types.ObjectId(merchantId), effectiveTo: null })
      .lean();
  }

  async updateDeal(
    merchantId: string,
    dto: UpdateMerchantDealDto,
    adminId: string,
  ): Promise<MerchantDealDocument> {
    if (!Types.ObjectId.isValid(merchantId)) throw new BadRequestException("Invalid merchant id");
    if (dto.customerDiscountPercent < 0 || dto.fazlMarginPercent < 0) {
      throw new BadRequestException("Percentages cannot be negative");
    }
    const merchantDealPercent = dto.customerDiscountPercent + dto.fazlMarginPercent;
    if (merchantDealPercent > 100) {
      throw new BadRequestException("Customer discount + Fazl margin cannot exceed 100%");
    }

    const merchantObjectId = new Types.ObjectId(merchantId);

    const previous = await this.dealModel.findOneAndUpdate(
      { merchantId: merchantObjectId, effectiveTo: null },
      { $set: { effectiveTo: new Date() } },
    );

    const created = await this.dealModel.create({
      merchantId: merchantObjectId,
      customerDiscountPercent: dto.customerDiscountPercent,
      fazlMarginPercent: dto.fazlMarginPercent,
      merchantDealPercent,
      effectiveFrom: new Date(),
      effectiveTo: null,
      createdBy: new Types.ObjectId(adminId),
      reason: dto.reason ?? null,
    });

    await this.auditLogService.record({
      adminId,
      action: "deal_change",
      targetType: "MerchantDeal",
      targetId: created._id.toString(),
      subjectUserId: merchantId,
      oldValue: previous
        ? {
            customerDiscountPercent: previous.customerDiscountPercent,
            fazlMarginPercent: previous.fazlMarginPercent,
            merchantDealPercent: previous.merchantDealPercent,
          }
        : null,
      newValue: {
        customerDiscountPercent: dto.customerDiscountPercent,
        fazlMarginPercent: dto.fazlMarginPercent,
        merchantDealPercent,
      },
      reason: dto.reason ?? null,
    });

    return created;
  }
}
