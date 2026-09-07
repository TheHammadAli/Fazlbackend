import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from "@nestjs/common";
import { I18nService } from "nestjs-i18n";
import { PrismaService } from "src/prisma/prisma.service";
import { generateObjectId, isObjectIdLike } from "src/common/utils/object-id.util";
import type { Promotion as PromotionRow, Prisma } from "../../generated/prisma/client";
import { CreatePromotionDto } from "./dto/create-promotion.dto";
import { UpdatePromotionDto } from "./dto/update-promotion.dto";
import {
  PROMOTION_CREATABLE_TARGET_TYPES,
  type Promotion,
} from "./model/promotion.model";

export type { Promotion } from "./model/promotion.model";

@Injectable()
export class PromotionService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly i18n: I18nService,
  ) {}

  /** Collapses the three typed columns back into the `targetId` the clients expect. */
  private toApiShape<T extends PromotionRow>(row: T): T & { targetId: string | null } {
    return {
      ...row,
      targetId: row.productId ?? row.shopId ?? row.serviceId ?? null,
    };
  }

  /** Maps the incoming (targetType, targetId) pair onto the correct column. */
  private targetColumns(
    targetType: string,
    targetId: string,
  ): Pick<Prisma.PromotionUncheckedCreateInput, "productId" | "shopId" | "serviceId"> {
    switch (targetType) {
      case "Product":
        return { productId: targetId, shopId: null, serviceId: null };
      case "Shop":
        return { productId: null, shopId: targetId, serviceId: null };
      case "Service":
        return { productId: null, shopId: null, serviceId: targetId };
      default:
        throw new BadRequestException(`Unsupported targetType "${targetType}"`);
    }
  }

  async create(dto: CreatePromotionDto, lang: string = "en"): Promise<Promotion> {
    // Validate targetType — unchanged: the DTO only ever admitted Product|Shop.
    if (!(PROMOTION_CREATABLE_TARGET_TYPES as readonly string[]).includes(dto.targetType)) {
      throw new BadRequestException(
        this.i18n.translate("promotion.invalid_target_type", { lang }),
      );
    }

    const row = await this.prisma.promotion.create({
      data: {
        id: generateObjectId(),
        subscriptionId: dto.subscriptionId,
        targetType: dto.targetType,
        ...this.targetColumns(dto.targetType, dto.targetId),
        startDate: new Date(dto.startDate),
        endDate: new Date(dto.endDate),
        status: dto.status ?? "active",
        isAutoRenew: dto.isAutoRenew ?? false,
      },
    });
    return this.toApiShape(row);
  }

  async findAll(): Promise<Promotion[]> {
    const rows = await this.prisma.promotion.findMany({
      orderBy: { createdAt: "desc" },
    });
    return rows.map((r) => this.toApiShape(r));
  }

  async findById(id: string, lang: string = "en"): Promise<Promotion> {
    if (!isObjectIdLike(id))
      throw new BadRequestException(
        this.i18n.translate("promotion.invalid_promotion_id", { lang }),
      );
    const promo = await this.prisma.promotion.findUnique({ where: { id } });
    if (!promo)
      throw new NotFoundException(
        this.i18n.translate("promotion.promotion_not_found", { lang }),
      );
    return this.toApiShape(promo);
  }

  async update(
    id: string,
    dto: UpdatePromotionDto,
    lang: string = "en",
  ): Promise<Promotion> {
    if (!isObjectIdLike(id))
      throw new BadRequestException(
        this.i18n.translate("promotion.invalid_promotion_id", { lang }),
      );
    const existing = await this.prisma.promotion.findUnique({ where: { id } });
    if (!existing)
      throw new NotFoundException(
        this.i18n.translate("promotion.promotion_not_found", { lang }),
      );

    const { targetType, targetId, startDate, endDate, ...rest } = dto as any;

    // A target change must move both the discriminator and the column together,
    // or the CHECK constraint rejects the write.
    const targetPatch =
      targetType && targetId
        ? { targetType, ...this.targetColumns(targetType, targetId) }
        : {};

    const row = await this.prisma.promotion.update({
      where: { id },
      data: {
        ...rest,
        ...targetPatch,
        ...(startDate ? { startDate: new Date(startDate) } : {}),
        ...(endDate ? { endDate: new Date(endDate) } : {}),
      },
    });
    return this.toApiShape(row);
  }

  async delete(id: string, lang: string = "en"): Promise<void> {
    if (!isObjectIdLike(id))
      throw new BadRequestException(
        this.i18n.translate("promotion.invalid_promotion_id", { lang }),
      );
    const existing = await this.prisma.promotion.findUnique({ where: { id } });
    if (!existing)
      throw new NotFoundException(
        this.i18n.translate("promotion.promotion_not_found", { lang }),
      );
    await this.prisma.promotion.delete({ where: { id } });
  }

  async getFeedPromotions(): Promise<Promotion[]> {
    const rows = await this.prisma.promotion.findMany({
      where: { isInFeed: true },
      orderBy: { createdAt: "desc" },
    });
    return rows.map((r) => this.toApiShape(r));
  }

  /**
   * Ids of products currently being promoted, used to pin them into listings.
   *
   * The old version returned every promotion's targetId regardless of type and
   * matched them against products — shop and service ids simply never matched.
   * Filtering on productId here is equivalent and says what it means.
   */
  async getActivePromotionProductIds(): Promise<string[]> {
    const now = new Date();

    const startOfDay = new Date(now);
    startOfDay.setUTCHours(0, 0, 0, 0);

    const endOfDay = new Date(now);
    endOfDay.setUTCHours(23, 59, 59, 999);

    const promotions = await this.prisma.promotion.findMany({
      where: {
        startDate: { lte: endOfDay },
        endDate: { gte: startOfDay },
        productId: { not: null },
      },
      select: { productId: true },
    });

    return promotions.map((p) => p.productId as string);
  }
}
