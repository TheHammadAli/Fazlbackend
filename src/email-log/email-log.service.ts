import { Injectable, Logger } from "@nestjs/common";
import { InjectModel } from "@nestjs/mongoose";
import { Model } from "mongoose";
import {
  EmailLog,
  EmailLogDocument,
  EmailLogEvent,
  EmailLogStatus,
  EMAIL_LOG_EVENTS,
  EMAIL_LOG_STATUSES,
} from "./schema/email-log.schema";
import { Counter, CounterDocument } from "src/common/schema/counter.schema";
import { PaginationDto } from "src/common/dto/pagination.dto";
import { PaginatedResponseDto } from "src/common/dto/pagination-response.dto";

type RecordParams = {
  eventType: EmailLogEvent;
  recipient: string;
  relatedRecordId?: string;
  deliveryStatus: EmailLogStatus;
};

@Injectable()
export class EmailLogService {
  private readonly logger = new Logger(EmailLogService.name);

  constructor(
    @InjectModel(EmailLog.name) private readonly emailLogModel: Model<EmailLogDocument>,
    @InjectModel(Counter.name) private readonly counterModel: Model<CounterDocument>,
  ) {}

  /** Atomically reserves the next sequential email log id (e.g. EML-000001). */
  private async generateNextEmailId(): Promise<string> {
    const counter = await this.counterModel.findByIdAndUpdate(
      "emailLogId",
      { $inc: { seq: 1 } },
      { new: true, upsert: true },
    );
    return `EML-${String(counter.seq).padStart(6, "0")}`;
  }

  /** Best-effort — a logging failure must never surface to the caller; the email itself already succeeded or failed independently. */
  async record(params: RecordParams): Promise<void> {
    try {
      const emailId = await this.generateNextEmailId();
      await this.emailLogModel.create({ emailId, ...params });
    } catch (err) {
      this.logger.error("Failed to record email log", err);
    }
  }

  /** Per-event send counts for the Email Logs page's summary cards. */
  async getStats(): Promise<{ data: { total: number; byEvent: Record<string, number> } }> {
    const rows = await this.emailLogModel.aggregate([
      { $group: { _id: "$eventType", count: { $sum: 1 } } },
    ]);

    const byEvent: Record<string, number> = {};
    let total = 0;
    for (const row of rows) {
      byEvent[row._id as string] = row.count;
      total += row.count;
    }

    return { data: { total, byEvent } };
  }

  async getAll(
    paginationDto: PaginationDto & { eventType?: string; deliveryStatus?: string },
  ): Promise<PaginatedResponseDto<EmailLog>> {
    const { page = 1, limit = 10, search, eventType, deliveryStatus } = paginationDto;
    const pageNum = Number(page) || 1;
    const limitNum = Number(limit) || 10;
    const skip = (pageNum - 1) * limitNum;

    const query: Record<string, any> = {};

    if (search?.trim()) {
      const escaped = search.trim().replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
      query.$or = [
        { emailId: { $regex: escaped, $options: "i" } },
        { recipient: { $regex: escaped, $options: "i" } },
        { relatedRecordId: { $regex: escaped, $options: "i" } },
      ];
    }
    if (eventType?.trim() && (EMAIL_LOG_EVENTS as readonly string[]).includes(eventType.trim())) {
      query.eventType = eventType.trim();
    }
    if (deliveryStatus?.trim() && (EMAIL_LOG_STATUSES as readonly string[]).includes(deliveryStatus.trim())) {
      query.deliveryStatus = deliveryStatus.trim();
    }

    const [data, total] = await Promise.all([
      this.emailLogModel
        .find(query)
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limitNum)
        .lean()
        .exec(),
      this.emailLogModel.countDocuments(query),
    ]);

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
