import { Injectable, Logger } from "@nestjs/common";
import { InjectModel } from "@nestjs/mongoose";
import { Model, Types } from "mongoose";
import { PaginatedResponseDto } from "src/common/dto/pagination-response.dto";
import { Counter, CounterDocument } from "src/common/schema/counter.schema";
import {
  WalletAuditLog,
  WalletAuditAction,
  WalletAuditTargetType,
  WalletAuditLogDocument,
} from "./schema/wallet-audit-log.schema";

export type RecordAuditLogInput = {
  adminId: string;
  action: WalletAuditAction;
  targetType: WalletAuditTargetType;
  targetId: string;
  subjectUserId?: string | null;
  transactionId?: string | null;
  oldValue?: Record<string, unknown> | null;
  newValue?: Record<string, unknown> | null;
  reason?: string | null;
  ipAddress?: string | null;
};

@Injectable()
export class WalletAuditLogService {
  private readonly logger = new Logger(WalletAuditLogService.name);

  constructor(
    @InjectModel(WalletAuditLog.name)
    private readonly auditLogModel: Model<WalletAuditLogDocument>,
    @InjectModel(Counter.name)
    private readonly counterModel: Model<CounterDocument>,
  ) {}

  private async generateNextLogCode(): Promise<string> {
    const counter = await this.counterModel.findByIdAndUpdate(
      "walletAuditLogCode",
      { $inc: { seq: 1 } },
      { new: true, upsert: true },
    );
    return `WAL-${String(counter.seq).padStart(6, "0")}`;
  }

  /** Unlike ActivityLogService's silent fire-and-forget, a failed write here is logged
   *  loudly — a missing audit entry for a balance change is itself a compliance gap —
   *  but it still must never throw back into the caller, since the underlying wallet
   *  action it's describing has already succeeded by the time this runs. */
  async record(input: RecordAuditLogInput): Promise<void> {
    try {
      const logCode = await this.generateNextLogCode();
      await this.auditLogModel.create({
        logCode,
        adminId: new Types.ObjectId(input.adminId),
        action: input.action,
        targetType: input.targetType,
        targetId: input.targetId,
        subjectUserId: input.subjectUserId ? new Types.ObjectId(input.subjectUserId) : null,
        transactionId: input.transactionId ? new Types.ObjectId(input.transactionId) : null,
        oldValue: input.oldValue ?? null,
        newValue: input.newValue ?? null,
        reason: input.reason ?? null,
        ipAddress: input.ipAddress ?? null,
      });
    } catch (err) {
      this.logger.error(
        `FAILED TO WRITE WALLET AUDIT LOG for action="${input.action}" targetType="${input.targetType}" targetId="${input.targetId}" — this is a compliance gap and needs manual investigation`,
        err instanceof Error ? err.stack : String(err),
      );
    }
  }

  async getAll(
    page = 1,
    limit = 20,
    filters?: {
      adminId?: string;
      action?: string;
      targetType?: string;
      subjectUserId?: string;
      startDate?: string;
      endDate?: string;
    },
  ): Promise<PaginatedResponseDto<any>> {
    const pageNum = Number(page) || 1;
    const limitNum = Number(limit) || 20;
    const skip = (pageNum - 1) * limitNum;

    const match: Record<string, any> = {};
    if (filters?.adminId?.trim() && Types.ObjectId.isValid(filters.adminId.trim())) {
      match.adminId = new Types.ObjectId(filters.adminId.trim());
    }
    if (filters?.action?.trim()) {
      match.action = filters.action.trim();
    }
    if (filters?.targetType?.trim()) {
      match.targetType = filters.targetType.trim();
    }
    if (filters?.subjectUserId?.trim() && Types.ObjectId.isValid(filters.subjectUserId.trim())) {
      match.subjectUserId = new Types.ObjectId(filters.subjectUserId.trim());
    }
    if (filters?.startDate || filters?.endDate) {
      match.createdAt = {};
      if (filters.startDate) match.createdAt.$gte = new Date(filters.startDate);
      if (filters.endDate) {
        const endOfDay = new Date(filters.endDate);
        endOfDay.setHours(23, 59, 59, 999);
        match.createdAt.$lte = endOfDay;
      }
    }

    const pipeline: any[] = [
      { $match: match },
      { $sort: { createdAt: -1 } },
      {
        $lookup: {
          from: "users",
          localField: "adminId",
          foreignField: "_id",
          as: "adminInfo",
        },
      },
      { $unwind: { path: "$adminInfo", preserveNullAndEmptyArrays: true } },
      {
        $lookup: {
          from: "users",
          localField: "subjectUserId",
          foreignField: "_id",
          as: "subjectInfo",
        },
      },
      { $unwind: { path: "$subjectInfo", preserveNullAndEmptyArrays: true } },
      {
        $project: {
          logCode: 1,
          action: 1,
          targetType: 1,
          targetId: 1,
          transactionId: 1,
          oldValue: 1,
          newValue: 1,
          reason: 1,
          ipAddress: 1,
          createdAt: 1,
          "adminInfo._id": 1,
          "adminInfo.name": 1,
          "adminInfo.email": 1,
          "subjectInfo._id": 1,
          "subjectInfo.name": 1,
          "subjectInfo.email": 1,
        },
      },
      {
        $facet: {
          data: [{ $skip: skip }, { $limit: limitNum }],
          totalCount: [{ $count: "count" }],
        },
      },
    ];

    const result = await this.auditLogModel.aggregate(pipeline).exec();
    const data = result[0]?.data ?? [];
    const total = result[0]?.totalCount?.[0]?.count ?? 0;

    return {
      data,
      meta: { total, page: pageNum, limit: limitNum, totalPages: Math.ceil(total / limitNum) },
    };
  }

  async getForTarget(targetType: WalletAuditTargetType, targetId: string): Promise<WalletAuditLog[]> {
    if (!Types.ObjectId.isValid(targetId)) return [];
    return this.auditLogModel
      .find({ targetType, targetId: new Types.ObjectId(targetId) })
      .sort({ createdAt: -1 })
      .lean();
  }
}
