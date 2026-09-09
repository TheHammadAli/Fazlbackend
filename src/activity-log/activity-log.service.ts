import { Injectable, Logger } from "@nestjs/common";
import { PaginatedResponseDto } from "src/common/dto/pagination-response.dto";
import { PrismaService } from "src/prisma/prisma.service";
import { generateObjectId, isObjectIdLike } from "src/common/utils/object-id.util";
import type {
  ActivityLogAction,
  ActivityLogTargetType,
  AdminRole,
  Prisma,
} from "../../generated/prisma/client";
import type { PrincipalType } from "src/auth/strategies/jwt-strategy";

/**
 * Who performed the action. Since staff were split out of `users` an id alone
 * no longer says which table to write the foreign key against, so callers pass
 * the JWT principal rather than a bare id.
 */
export type ActivityActor = { sub: string; principal?: PrincipalType };

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
    actor: ActivityActor,
    action: ActivityLogAction,
    targetType?: string,
    targetId?: string,
    details?: string,
    ipAddress?: string,
  ): Promise<void> {
    try {
      // Only staff actions are auditable, and the actor column is a real foreign
      // key into one of the two staff tables. A customer principal has no row to
      // point at, so the write is skipped rather than left to fail on the FK.
      if (actor?.principal !== "admin" && actor?.principal !== "member") {
        this.logger.warn(
          `Skipping activity log "${action}": actor ${actor?.sub} is not staff`,
        );
        return;
      }

      const logCode = await this.generateNextLogCode();
      await this.prisma.activityLog.create({
        data: {
          id: generateObjectId(),
          logCode,
          ...(actor.principal === "admin"
            ? { actorAdminId: actor.sub }
            : { actorMemberId: actor.sub }),
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
    // "moderator" is no longer a role on any row — it is what being in the
    // `members` table means, so it filters by which actor column is set.
    if (role?.trim()) {
      const wanted = role.trim();
      where.AND = [
        wanted === "moderator"
          ? { actorMemberId: { not: null } }
          : { actorAdmin: { role: wanted as AdminRole } },
      ];
    }
    if (actorId?.trim() && isObjectIdLike(actorId.trim())) {
      const id = actorId.trim();
      where.OR = [{ actorAdminId: id }, { actorMemberId: id }];
    }
    if (search?.trim()) {
      const term = search.trim();
      const contains = { contains: term, mode: "insensitive" as const };
      // Nested under AND so it cannot overwrite the actorId OR above.
      where.AND = [
        ...(Array.isArray(where.AND) ? where.AND : where.AND ? [where.AND] : []),
        {
          OR: [
            { actorAdmin: { name: contains } },
            { actorAdmin: { email: contains } },
            { actorMember: { name: contains } },
            { actorMember: { email: contains } },
            { details: contains },
          ],
        },
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
          actorAdmin: { select: { id: true, name: true, email: true, role: true } },
          actorMember: { select: { id: true, name: true, email: true } },
        },
      }),
      this.prisma.activityLog.count({ where }),
    ]);

    // The old $project emitted the joined user as `actorInfo`; the admin panel
    // reads that key, so the response shape is preserved exactly — including a
    // `roles` array, which staff rows no longer store but every role check in
    // the panel still reads.
    const data = rows.map(({ actorAdmin, actorMember, ...rest }) => ({
      ...rest,
      actorInfo: actorAdmin
        ? { id: actorAdmin.id, name: actorAdmin.name, email: actorAdmin.email, roles: [actorAdmin.role] }
        : actorMember
          ? { id: actorMember.id, name: actorMember.name, email: actorMember.email, roles: ["moderator"] }
          : null,
    }));

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
