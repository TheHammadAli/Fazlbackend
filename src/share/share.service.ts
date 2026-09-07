import { BadRequestException, Injectable } from "@nestjs/common";
import { PrismaService } from "src/prisma/prisma.service";
import { generateObjectId, isObjectIdLike } from "src/common/utils/object-id.util";
import { CreateShareDto } from "./dto/share.dto";
import { ITEM_TYPES, type ItemType } from "./model/share.model";

@Injectable()
export class ShareService {
  constructor(private readonly prisma: PrismaService) {}

  // No global ValidationPipe is registered in this app, so class-validator decorators on the
  // DTO are documentation only, not enforcement — this must be checked explicitly at runtime.
  private validateDto(dto: CreateShareDto) {
    if (!dto.itemId || !isObjectIdLike(dto.itemId)) {
      throw new BadRequestException("A valid itemId is required");
    }
    if (!(ITEM_TYPES as readonly string[]).includes(dto.itemType)) {
      throw new BadRequestException("itemType must be 'product' or 'service'");
    }
  }

  /** Records a share, deduped per (user, item) — repeat shares by the same user don't recount. */
  async trackShare(userId: string, dto: CreateShareDto): Promise<void> {
    this.validateDto(dto);

    // Was updateOne(..., { $setOnInsert }, { upsert: true }). The @@unique index
    // on (userId, itemId, itemType) makes this the same single atomic statement,
    // and `update: {}` keeps an existing row untouched exactly like $setOnInsert.
    await this.prisma.share.upsert({
      where: {
        userId_itemId_itemType: {
          userId,
          itemId: dto.itemId,
          itemType: dto.itemType as ItemType,
        },
      },
      create: {
        id: generateObjectId(),
        userId,
        itemId: dto.itemId,
        itemType: dto.itemType as ItemType,
      },
      update: {},
    });
  }

  /** Count shares for a single item. */
  async getShareCount(itemId: string, itemType: ItemType): Promise<number> {
    return this.prisma.share.count({ where: { itemId, itemType } });
  }

  /**
   * Admin: paginated list of the users who shared one item, newest first —
   * powers the "who shared this" drill-down on the admin Feed page.
   */
  async getSharersForItem(
    itemId: string,
    itemType: ItemType,
    page = 1,
    limit = 20,
  ): Promise<{
    data: unknown[];
    meta: { total: number; page: number; limit: number; totalPages: number };
  }> {
    const pageNum = Number(page) || 1;
    const limitNum = Number(limit) || 20;
    const skip = (pageNum - 1) * limitNum;
    const where = { itemId, itemType };

    // Was a $lookup into users plus a separate countDocuments; the relation
    // makes it a single include.
    const [rows, total] = await Promise.all([
      this.prisma.share.findMany({
        where,
        orderBy: { createdAt: "desc" },
        skip,
        take: limitNum,
        select: {
          id: true,
          createdAt: true,
          user: { select: { id: true, name: true, email: true, image: true } },
        },
      }),
      this.prisma.share.count({ where }),
    ]);

    return {
      data: rows,
      meta: { total, page: pageNum, limit: limitNum, totalPages: Math.ceil(total / limitNum) },
    };
  }

  /** Bulk share counts for a page of items, in one query. */
  async getShareCountsForItems(
    itemIds: string[],
    itemType: ItemType,
  ): Promise<Map<string, number>> {
    if (itemIds.length === 0) return new Map();

    // Was aggregate([{ $match }, { $group: { _id: "$itemId", count: { $sum: 1 } } }]).
    const results = await this.prisma.share.groupBy({
      by: ["itemId"],
      where: { itemId: { in: itemIds }, itemType },
      _count: { _all: true },
    });

    return new Map(results.map((r) => [r.itemId, r._count._all]));
  }
}
