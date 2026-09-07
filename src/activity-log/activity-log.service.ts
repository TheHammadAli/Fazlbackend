import { Injectable, Logger } from "@nestjs/common";
import { PaginatedResponseDto } from "src/common/dto/pagination-response.dto";
import { PrismaService } from "src/prisma/prisma.service";
import { generateObjectId, isObjectIdLike } from "src/common/utils/object-id.util";
import type {
  ActivityLogAction,
  ActivityLogTargetType,
  Prisma,
  UserRole,
} from "../../generated/prisma/client";

@Injectable()
export class ActivityLogService {
  private readonly logger = new Logger(ActivityLogService.name);

  constructor(private readonly prisma: PrismaService) {}

  private async generateNextLogCode(): Promise<number> {
    const counter = await this.prisma.counter.upsert({
      where: { id: "activityLogCode" },
      create: { id: "activityLogCode", seq: 1 },
      update: { seq: { increment: 1 } },
    });
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
      await this.prisma.activityLog.create({
        data: {
          id: generateObjectId(),
          logCode,
          actorId,
          action,
          targetType: (targetType as ActivityLogTargetType) ?? null,
          targetId: targetId ?? null,
          details: details ?? null,
          ipAddress: ipAddress ?? null,
        },
      });
    } catch (err) {
      this.logger.error("Failed to record activity log", err);
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

    // Was a $lookup into users, then $match, $sort, $project and a $facet for
    // the count. A real foreign key makes that one relation filter plus a
    // count — no pipeline, and no risk of the two halves of the $facet
    // disagreeing.
    const where: Prisma.ActivityLogWhereInput = {};

    if (action?.trim()) {
      where.action = action.trim() as ActivityLogAction;
    }
    if (role?.trim()) {
      where.actor = { roles: { has: role.trim() as UserRole } };
    }
    if (actorId?.trim() && isObjectIdLike(actorId.trim())) {
      where.actorId = actorId.trim();
    }
    if (search?.trim()) {
      const term = search.trim();
      where.OR = [
        { actor: { name: { contains: term, mode: "insensitive" } } },
        { actor: { email: { contains: term, mode: "insensitive" } } },
        { details: { contains: term, mode: "insensitive" } },
      ];
    }

    const [rows, total] = await Promise.all([
      this.prisma.activityLog.findMany({
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
          details: true,
          ipAddress: true,
          createdAt: true,
          actor: { select: { id: true, name: true, email: true } },
        },
      }),
      this.prisma.activityLog.count({ where }),
    ]);

    // The old $project emitted the joined user as `actorInfo`; the admin panel
    // reads that key, so the response shape is preserved exactly.
    const data = rows.map(({ actor, ...rest }) => ({ ...rest, actorInfo: actor }));

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
