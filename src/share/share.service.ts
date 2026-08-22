import { BadRequestException, Injectable } from "@nestjs/common";
import { InjectModel } from "@nestjs/mongoose";
import { Model, Types } from "mongoose";
import { Share, ShareDocument } from "./schema/share.schema";
import { CreateShareDto } from "./dto/share.dto";

@Injectable()
export class ShareService {
  constructor(
    @InjectModel(Share.name) private readonly shareModel: Model<ShareDocument>,
  ) { }

  // No global ValidationPipe is registered in this app, so class-validator decorators on the
  // DTO are documentation only, not enforcement — this must be checked explicitly at runtime.
  private validateDto(dto: CreateShareDto) {
    if (!dto.itemId || !Types.ObjectId.isValid(dto.itemId)) {
      throw new BadRequestException("A valid itemId is required");
    }
    if (dto.itemType !== "product" && dto.itemType !== "service") {
      throw new BadRequestException("itemType must be 'product' or 'service'");
    }
  }

  /** Records a share, deduped per (user, item) — repeat shares by the same user don't recount. */
  async trackShare(userId: string, dto: CreateShareDto): Promise<void> {
    this.validateDto(dto);

    await this.shareModel.updateOne(
      {
        userId: new Types.ObjectId(userId),
        itemId: new Types.ObjectId(dto.itemId),
        itemType: dto.itemType,
      },
      {
        $setOnInsert: {
          userId: new Types.ObjectId(userId),
          itemId: new Types.ObjectId(dto.itemId),
          itemType: dto.itemType,
        },
      },
      { upsert: true },
    );
  }

  /** Count shares for a single item. */
  async getShareCount(itemId: string, itemType: "product" | "service"): Promise<number> {
    return this.shareModel.countDocuments({
      itemId: new Types.ObjectId(itemId),
      itemType,
    });
  }

  /** Bulk share counts for a page of items, in one aggregation query. */
  async getShareCountsForItems(
    itemIds: string[],
    itemType: "product" | "service",
  ): Promise<Map<string, number>> {
    if (itemIds.length === 0) return new Map();

    const results = await this.shareModel.aggregate([
      {
        $match: {
          itemId: { $in: itemIds.map((id) => new Types.ObjectId(id)) },
          itemType,
        },
      },
      { $group: { _id: "$itemId", count: { $sum: 1 } } },
    ]);

    return new Map(results.map((r) => [r._id.toString(), r.count as number]));
  }
}
