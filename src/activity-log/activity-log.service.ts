import { Injectable } from "@nestjs/common";
import { InjectModel } from "@nestjs/mongoose";
import { Model, Types } from "mongoose";
import { PaginatedResponseDto } from "src/common/dto/pagination-response.dto";
import { Counter, CounterDocument } from "src/common/schema/counter.schema";
import {
  ActivityLog,
  ActivityLogAction,
  ActivityLogDocument,
} from "./schema/activity-log.schema";

@Injectable()
export class ActivityLogService {
  constructor(
    @InjectModel(ActivityLog.name)
    private readonly activityLogModel: Model<ActivityLogDocument>,
    @InjectModel(Counter.name)
    private readonly counterModel: Model<CounterDocument>,
  ) {}

  private async generateNextLogCode(): Promise<number> {
    const counter = await this.counterModel.findByIdAndUpdate(
      "activityLogCode",
      { $inc: { seq: 1 } },
      { new: true, upsert: true },
    );
    return counter.seq;
  }

  /** Fire-and-forget: an audit-log write must never break the real action it's describing. */
  async record(
    actorId: string,
    action: ActivityLogAction,
    targetType?: string,
    targetId?: string,
    details?: string,
    ipAddress?: string,
  ): Promise<void> {
    try {
      const logCode = await this.generateNextLogCode();
      await this.activityLogModel.create({
        logCode,
        actor: new Types.ObjectId(actorId),
        action,
        targetType,
        targetId: targetId ? new Types.ObjectId(targetId) : undefined,
        details,
        ipAddress,
      });
    } catch (err) {
      console.error("Failed to record activity log:", err);
    }
  }

  async getAllActivityLogs(
    page = 1,
    limit = 10,
    search?: string,
    action?: string,
    role?: string,
    actorId?: string,
  ): Promise<PaginatedResponseDto<any>> {
    const pageNum = Number(page) || 1;
    const limitNum = Number(limit) || 10;
    const skip = (pageNum - 1) * limitNum;

    const pipeline: any[] = [
      {
        $lookup: {
          from: "users",
          localField: "actor",
          foreignField: "_id",
          as: "actorInfo",
        },
      },
      { $unwind: { path: "$actorInfo", preserveNullAndEmptyArrays: true } },
    ];

    const matchStage: Record<string, any> = {};
    if (action?.trim()) {
      matchStage.action = action.trim();
    }
    if (role?.trim()) {
      matchStage["actorInfo.roles"] = role.trim();
    }
    if (actorId?.trim() && Types.ObjectId.isValid(actorId.trim())) {
      matchStage.actor = new Types.ObjectId(actorId.trim());
    }
    if (search?.trim()) {
      const regex = { $regex: search.trim(), $options: "i" };
      matchStage.$or = [
        { "actorInfo.name": regex },
        { "actorInfo.email": regex },
        { details: regex },
      ];
    }
    if (Object.keys(matchStage).length > 0) {
      pipeline.push({ $match: matchStage });
    }

    pipeline.push(
      { $sort: { createdAt: -1 } },
      {
        $project: {
          logCode: 1,
          action: 1,
          targetType: 1,
          targetId: 1,
          details: 1,
          ipAddress: 1,
          createdAt: 1,
          "actorInfo._id": 1,
          "actorInfo.name": 1,
          "actorInfo.email": 1,
        },
      },
      {
        $facet: {
          data: [{ $skip: skip }, { $limit: limitNum }],
          totalCount: [{ $count: "count" }],
        },
      },
    );

    const result = await this.activityLogModel.aggregate(pipeline).exec();
    const data = result[0]?.data ?? [];
    const total = result[0]?.totalCount?.[0]?.count ?? 0;

    return {
      data,
      meta: {
        total,
        page: pageNum,
        limit: limitNum,
        totalPages: Math.ceil(total / limitNum),
      },
    };
  }
}
