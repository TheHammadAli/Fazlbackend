import { Injectable } from "@nestjs/common";
import { PrismaService } from "../prisma.service";
import { Prisma } from "../../../generated/prisma/client";
import type { AdminReportRow } from "../../reports/model/report.model";

/**
 * The admin Reports list, as raw SQL.
 *
 * This replaces a six-stage aggregation: a $lookup into users for the reporter,
 * four more $lookups (shops / products / services / users) to resolve the
 * polymorphic entityId, an $addFields $switch to pick the right title, and a
 * second identical pipeline ending in $count just to get the total.
 *
 * A LEFT JOIN per entity type plus COALESCE says the same thing in one
 * statement, and the search clause can filter on the resolved title directly
 * instead of needing a second $match stage after $addFields.
 *
 * Kept in a repository rather than the service so the SQL is reviewable and
 * testable on its own, and so no controller ever sees it.
 *
 * NOTE on enums: these queries compare against the values stored in Postgres —
 * the @map'd ones, e.g. reason = 'Adult Content'. The Prisma client instead
 * speaks the identifier (AdultContent). Raw SQL therefore takes wire values
 * directly and needs no translation; anything going through the typed client
 * does. See common/utils/enum-wire.util.
 */
@Injectable()
export class ReportRepository {
  constructor(private readonly prisma: PrismaService) {}

  /** Shared WHERE fragments, so the page query and the count can never diverge. */
  private buildFilters(opts: {
    entityType?: string;
    status?: string;
    reason?: string;
    search?: string;
    startDate?: string;
    endDate?: string;
  }): Prisma.Sql {
    const clauses: Prisma.Sql[] = [Prisma.sql`TRUE`];

    if (opts.entityType) {
      clauses.push(Prisma.sql`r.entity_type::text = ${opts.entityType}`);
    }
    if (opts.status) {
      clauses.push(Prisma.sql`r.status::text = ${opts.status}`);
    }
    if (opts.reason) {
      clauses.push(Prisma.sql`r.reason::text = ${opts.reason}`);
    }
    if (opts.startDate) {
      clauses.push(Prisma.sql`r.created_at >= ${new Date(opts.startDate)}`);
    }
    if (opts.endDate) {
      const endOfDay = new Date(opts.endDate);
      endOfDay.setHours(23, 59, 59, 999);
      clauses.push(Prisma.sql`r.created_at <= ${endOfDay}`);
    }

    const search = opts.search?.trim();
    if (search) {
      // No regex escaping needed: ILIKE takes a parameterised pattern, and the
      // only metacharacters are % and _, which the old $regex would have
      // treated as literals anyway.
      const pattern = `%${search.replace(/[%_\\]/g, "\\$&")}%`;
      clauses.push(Prisma.sql`(
        u.name ILIKE ${pattern}
        OR u.email ILIKE ${pattern}
        OR r.report_code ILIKE ${pattern}
        OR r.details ILIKE ${pattern}
        OR COALESCE(sh.title, p.title, sv.title, eu.name) ILIKE ${pattern}
      )`);
    }

    return Prisma.join(clauses, " AND ");
  }

  /** The four LEFT JOINs that resolve the polymorphic entityId to a title. */
  private readonly joins = Prisma.sql`
    LEFT JOIN users    u  ON u.id  = r.reporter_id
    LEFT JOIN shops    sh ON r.entity_type::text = 'shop'    AND sh.id = r.entity_id
    LEFT JOIN products p  ON r.entity_type::text = 'product' AND p.id  = r.entity_id
    LEFT JOIN services sv ON r.entity_type::text = 'service' AND sv.id = r.entity_id
    LEFT JOIN users    eu ON r.entity_type::text = 'user'    AND eu.id = r.entity_id
  `;

  async findForAdmin(opts: {
    skip: number;
    take: number;
    entityType?: string;
    status?: string;
    reason?: string;
    search?: string;
    startDate?: string;
    endDate?: string;
  }): Promise<{ rows: AdminReportRow[]; total: number }> {
    const where = this.buildFilters(opts);

    const [rows, countRows] = await Promise.all([
      this.prisma.$queryRaw<
        {
          id: string;
          report_code: string | null;
          entity_id: string;
          entity_type: string;
          entity_title: string | null;
          reason: string;
          details: string;
          status: string;
          content_removed: boolean;
          admin_response: string | null;
          responded_at: Date | null;
          closed_at: Date | null;
          created_at: Date;
          reporter_id: string | null;
          reporter_name: string | null;
          reporter_email: string | null;
        }[]
      >`
        SELECT r.id,
               r.report_code,
               r.entity_id,
               r.entity_type::text AS entity_type,
               COALESCE(sh.title, p.title, sv.title, eu.name) AS entity_title,
               r.reason::text  AS reason,
               r.details,
               r.status::text  AS status,
               r.content_removed,
               r.admin_response,
               r.responded_at,
               r.closed_at,
               r.created_at,
               u.id    AS reporter_id,
               u.name  AS reporter_name,
               u.email AS reporter_email
        FROM reports r
        ${this.joins}
        WHERE ${where}
        ORDER BY r.created_at DESC
        LIMIT ${opts.take} OFFSET ${opts.skip}
      `,
      this.prisma.$queryRaw<{ total: bigint }[]>`
        SELECT count(*)::bigint AS total
        FROM reports r
        ${this.joins}
        WHERE ${where}
      `,
    ]);

    return {
      rows: rows.map((r) => ({
        // Both keys: clients read _id, and the response interceptor mirrors
        // `id` only on objects that have one.
        _id: r.id,
        id: r.id,
        reportCode: r.report_code,
        entityId: r.entity_id,
        entityType: r.entity_type as AdminReportRow["entityType"],
        entityTitle: r.entity_title,
        reason: r.reason as AdminReportRow["reason"],
        details: r.details,
        status: r.status as AdminReportRow["status"],
        contentRemoved: r.content_removed,
        adminResponse: r.admin_response,
        respondedAt: r.responded_at,
        closedAt: r.closed_at,
        createdAt: r.created_at,
        reporter: r.reporter_id
          ? {
              _id: r.reporter_id,
              id: r.reporter_id,
              name: r.reporter_name,
              email: r.reporter_email as string,
            }
          : null,
      })),
      total: Number(countRows[0]?.total ?? 0),
    };
  }
}
