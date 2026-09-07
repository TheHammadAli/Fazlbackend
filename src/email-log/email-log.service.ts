import { Injectable, Logger } from "@nestjs/common";
import { PrismaService } from "src/prisma/prisma.service";
import { generateObjectId } from "src/common/utils/object-id.util";
import {
  EMAIL_LOG_EVENTS,
  EMAIL_LOG_STATUSES,
  type EmailLog,
  type EmailLogEvent,
  type EmailLogStatus,
} from "./model/email-log.model";
import { PaginationDto } from "src/common/dto/pagination.dto";
import { PaginatedResponseDto } from "src/common/dto/pagination-response.dto";
import type { Prisma } from "../../generated/prisma/client";
import { resolvePagination } from "../common/utils/pagination.util";

type RecordParams = {
  eventType: EmailLogEvent;
  recipient: string;
  relatedRecordId?: string;
  deliveryStatus: EmailLogStatus;
};

@Injectable()
export class EmailLogService {
  private readonly logger = new Logger(EmailLogService.name);

  constructor(private readonly prisma: PrismaService) {}

  /**
   * Atomically reserves the next sequential email log id (e.g. EML-000001).
   *
   * Was findByIdAndUpdate(..., { $inc }, { upsert: true }). upsert + increment
   * is a single atomic statement in Postgres too, so the guarantee is unchanged.
   */
  private async generateNextEmailId(): Promise<string> {
    const counter = await this.prisma.counter.upsert({
      where: { id: "emailLogId" },
      create: { id: "emailLogId", seq: 1 },
      update: { seq: { increment: 1 } },
    });
    return `EML-${String(counter.seq).padStart(6, "0")}`;
  }

  /** Best-effort — a logging failure must never surface to the caller; the email itself already succeeded or failed independently. */
  async record(params: RecordParams): Promise<void> {
    try {
      const emailId = await this.generateNextEmailId();
      await this.prisma.emailLog.create({
        // Mongo assigned _id itself; Postgres needs one supplied, in the same
        // 24-char hex shape every existing row already uses.
        data: { id: generateObjectId(), emailId, ...params },
      });
    } catch (err) {
      this.logger.error("Failed to record email log", err);
    }
  }

  /** Per-event send counts for the Email Logs page's summary cards. */
  async getStats(): Promise<{ data: { total: number; byEvent: Record<string, number> } }> {
    // Was an aggregate([{ $group: { _id: "$eventType", count: { $sum: 1 } } }]).
    const rows = await this.prisma.emailLog.groupBy({
      by: ["eventType"],
      _count: { _all: true },
    });

    const byEvent: Record<string, number> = {};
    let total = 0;
    for (const row of rows) {
      byEvent[row.eventType] = row._count._all;
      total += row._count._all;
    }

    return { data: { total, byEvent } };
  }

  async getAll(
    paginationDto: PaginationDto & { eventType?: string; deliveryStatus?: string },
  ): Promise<PaginatedResponseDto<EmailLog>> {
    const { page: rawPage, limit: rawLimit, search, eventType, deliveryStatus } = paginationDto;
    const { page: pageNum, limit: limitNum, skip } = resolvePagination(rawPage, rawLimit);

    const where: Prisma.EmailLogWhereInput = {};

    if (search?.trim()) {
      // No regex escaping needed any more: `contains` is a parameterised LIKE,
      // not a regular expression, so the input is never interpreted as a pattern.
      const term = search.trim();
      where.OR = [
        { emailId: { contains: term, mode: "insensitive" } },
        { recipient: { contains: term, mode: "insensitive" } },
        { relatedRecordId: { contains: term, mode: "insensitive" } },
      ];
    }
    if (eventType?.trim() && (EMAIL_LOG_EVENTS as readonly string[]).includes(eventType.trim())) {
      where.eventType = eventType.trim() as EmailLogEvent;
    }
    if (
      deliveryStatus?.trim() &&
      (EMAIL_LOG_STATUSES as readonly string[]).includes(deliveryStatus.trim())
    ) {
      where.deliveryStatus = deliveryStatus.trim() as EmailLogStatus;
    }

    const [data, total] = await Promise.all([
      this.prisma.emailLog.findMany({
        where,
        orderBy: { createdAt: "desc" },
        skip,
        take: limitNum,
      }),
      this.prisma.emailLog.count({ where }),
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
