import { Injectable, Logger } from "@nestjs/common";
import { PaginatedResponseDto } from "src/common/dto/pagination-response.dto";
import { COUNTER_KEYS } from "src/common/model/counter.model";
import { generateObjectId, isObjectIdLike } from "src/common/utils/object-id.util";
import { PrismaService } from "src/prisma/prisma.service";
import { Prisma } from "../../generated/prisma/client";
import {
  WALLET_AUDIT_ACTIONS,
  WALLET_AUDIT_TARGET_TYPES,
  WalletAuditAction,
  WalletAuditLog,
  WalletAuditTargetType,
} from "./model/wallet.model";

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

/** A nullable Json column needs `Prisma.DbNull` to store SQL NULL — a bare `null` is
 *  rejected, because for a non-nullable Json column it would have meant the JSON
 *  literal `null` instead. */
function toJsonInput(
  value: Record<string, unknown> | null | undefined,
): Prisma.InputJsonValue | Prisma.NullTypes.DbNull {
  return value == null ? Prisma.DbNull : (value as Prisma.InputJsonObject);
}

const userBriefSelect = { id: true, name: true, email: true } satisfies Prisma.UserSelect;

@Injectable()
export class WalletAuditLogService {
  private readonly logger = new Logger(WalletAuditLogService.name);

  constructor(private readonly prisma: PrismaService) {}

  private async generateNextLogCode(): Promise<string> {
    const counter = await this.prisma.counter.upsert({
      where: { id: COUNTER_KEYS.walletAuditLog },
      create: { id: COUNTER_KEYS.walletAuditLog, seq: 1 },
      update: { seq: { increment: 1 } },
    });
    return `WAL-${String(counter.seq).padStart(6, "0")}`;
  }

  /** Unlike ActivityLogService's silent fire-and-forget, a failed write here is logged
   *  loudly — a missing audit entry for a balance change is itself a compliance gap —
   *  but it still must never throw back into the caller, since the underlying wallet
   *  action it's describing has already succeeded by the time this runs. */
  async record(input: RecordAuditLogInput): Promise<void> {
    try {
      const logCode = await this.generateNextLogCode();
      await this.prisma.walletAuditLog.create({
        data: {
          id: generateObjectId(),
          logCode,
          adminId: input.adminId,
          action: input.action,
          targetType: input.targetType,
          targetId: input.targetId,
          subjectUserId: input.subjectUserId ?? null,
          transactionId: input.transactionId ?? null,
          oldValue: toJsonInput(input.oldValue),
          newValue: toJsonInput(input.newValue),
          reason: input.reason ?? null,
          ipAddress: input.ipAddress ?? null,
        },
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
    const emptyPage = {
      data: [],
      meta: { total: 0, page: pageNum, limit: limitNum, totalPages: 0 },
    };

    const where: Prisma.WalletAuditLogWhereInput = {};

    const adminId = filters?.adminId?.trim();
    if (adminId && isObjectIdLike(adminId)) where.adminId = adminId;

    const subjectUserId = filters?.subjectUserId?.trim();
    if (subjectUserId && isObjectIdLike(subjectUserId)) where.subjectUserId = subjectUserId;

    // An unrecognised enum value is a Prisma validation error rather than a query that
    // matches nothing, so filter it out here and return an empty page — which is what
    // the equivalent Mongo query did for the same input.
    const action = filters?.action?.trim();
    if (action) {
      if (!(WALLET_AUDIT_ACTIONS as readonly string[]).includes(action)) return emptyPage;
      where.action = action as WalletAuditAction;
    }

    const targetType = filters?.targetType?.trim();
    if (targetType) {
      if (!(WALLET_AUDIT_TARGET_TYPES as readonly string[]).includes(targetType)) return emptyPage;
      where.targetType = targetType as WalletAuditTargetType;
    }

    if (filters?.startDate || filters?.endDate) {
      const createdAt: Prisma.DateTimeFilter = {};
      if (filters.startDate) createdAt.gte = new Date(filters.startDate);
      if (filters.endDate) {
        const endOfDay = new Date(filters.endDate);
        endOfDay.setHours(23, 59, 59, 999);
        createdAt.lte = endOfDay;
      }
      where.createdAt = createdAt;
    }

    // Two $lookups + $unwind + $project + $facet collapse into one findMany with
    // relations selected inline, plus a count.
    const [rows, total] = await Promise.all([
      this.prisma.walletAuditLog.findMany({
        where,
        orderBy: { createdAt: "desc" },
        skip,
        take: limitNum,
        select: {
          id: true,
          logCode: true,
          action: true,
          targetType: true,
          targetId: true,
          transactionId: true,
          oldValue: true,
          newValue: true,
          reason: true,
          ipAddress: true,
          createdAt: true,
          admin: { select: userBriefSelect },
          subjectUser: { select: userBriefSelect },
        },
      }),
      this.prisma.walletAuditLog.count({ where }),
    ]);

    // `adminInfo`/`subjectInfo` are the field names the old $project produced; the
    // response interceptor mirrors each `id` to `_id` for existing clients.
    const data = rows.map(({ admin, subjectUser, ...row }) => ({
      ...row,
      adminInfo: admin,
      subjectInfo: subjectUser,
    }));

    return {
      data,
      meta: { total, page: pageNum, limit: limitNum, totalPages: Math.ceil(total / limitNum) },
    };
  }

  /** `targetId` is a plain string column, not a foreign key: WalletSettings entries carry
   *  the fixed singleton id. The Mongo version rejected any non-ObjectId target here, so
   *  wallet-settings changes were written but never readable back — they are now. */
  async getForTarget(
    targetType: WalletAuditTargetType,
    targetId: string,
  ): Promise<WalletAuditLog[]> {
    return this.prisma.walletAuditLog.findMany({
      where: { targetType, targetId },
      orderBy: { createdAt: "desc" },
    });
  }
}
