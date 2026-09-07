import { BadRequestException, Injectable } from "@nestjs/common";
import { generateObjectId, isObjectIdLike } from "src/common/utils/object-id.util";
import { PrismaService } from "src/prisma/prisma.service";
import { UpdateMerchantDealDto } from "./dto/update-merchant-deal.dto";
import { MerchantDeal } from "./model/wallet.model";
import { WalletAuditLogService } from "./wallet-audit-log.service";

/** Append-only merchant deal versioning (spec §4). A deal row is never updated in place —
 *  changing terms closes the active row and inserts a new one. merchantDealPercent is
 *  always server-computed (customerDiscountPercent + fazlMarginPercent), never accepted
 *  from the client, so the two can never disagree.
 *
 *  Closing and inserting run in one transaction: the `merchant_deals_active_uniq` partial
 *  index allows only one row per merchant with `effective_to IS NULL`, so doing these as
 *  two independent writes could leave a merchant with no active deal, or lose the second
 *  write outright when two admins save at once. */
@Injectable()
export class MerchantDealService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly auditLogService: WalletAuditLogService,
  ) {}

  async getCurrentAndHistory(merchantId: string) {
    if (!isObjectIdLike(merchantId)) throw new BadRequestException("Invalid merchant id");

    const [current, history] = await Promise.all([
      this.prisma.merchantDeal.findFirst({ where: { merchantId, effectiveTo: null } }),
      this.prisma.merchantDeal.findMany({
        where: { merchantId },
        orderBy: { createdAt: "desc" },
        take: 50,
      }),
    ]);

    return { current, history };
  }

  async getActiveDeal(merchantId: string): Promise<MerchantDeal | null> {
    if (!isObjectIdLike(merchantId)) return null;
    return this.prisma.merchantDeal.findFirst({ where: { merchantId, effectiveTo: null } });
  }

  async updateDeal(
    merchantId: string,
    dto: UpdateMerchantDealDto,
    adminId: string,
  ): Promise<MerchantDeal> {
    if (!isObjectIdLike(merchantId)) throw new BadRequestException("Invalid merchant id");
    if (dto.customerDiscountPercent < 0 || dto.fazlMarginPercent < 0) {
      throw new BadRequestException("Percentages cannot be negative");
    }
    const merchantDealPercent = dto.customerDiscountPercent + dto.fazlMarginPercent;
    if (merchantDealPercent > 100) {
      throw new BadRequestException("Customer discount + Fazl margin cannot exceed 100%");
    }

    const now = new Date();

    const { previous, created } = await this.prisma.$transaction(async (tx) => {
      const active = await tx.merchantDeal.findFirst({
        where: { merchantId, effectiveTo: null },
      });
      if (active) {
        await tx.merchantDeal.update({
          where: { id: active.id },
          data: { effectiveTo: now },
        });
      }

      const row = await tx.merchantDeal.create({
        data: {
          id: generateObjectId(),
          merchantId,
          customerDiscountPercent: dto.customerDiscountPercent,
          fazlMarginPercent: dto.fazlMarginPercent,
          merchantDealPercent,
          effectiveFrom: now,
          effectiveTo: null,
          createdById: adminId,
          reason: dto.reason ?? null,
        },
      });

      return { previous: active, created: row };
    });

    await this.auditLogService.record({
      adminId,
      action: "deal_change",
      targetType: "MerchantDeal",
      targetId: created.id,
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
