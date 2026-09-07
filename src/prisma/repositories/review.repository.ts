import { Injectable } from "@nestjs/common";
import { PrismaService } from "../prisma.service";
import { Prisma } from "../../../generated/prisma/client";
import type { AdminReviewRow } from "../../reviews/model/review.model";

/**
 * The admin Reviews list, as raw SQL.
 *
 * Replaces a pipeline that did a $lookup into users for the reviewer, two more
 * into products and services to resolve the polymorphic itemId, an $addFields
 * $cond to pick the right title, and then ran the whole thing a second time
 * ending in $count purely to get the total.
 *
 * `itemId` + `itemType` stays denormalised in the schema (these are high-write,
 * low-integrity-risk rows), so resolving the title is a join per possible type
 * plus a COALESCE — the same approach ReportRepository takes for its four.
 */
@Injectable()
export class ReviewRepository {
  constructor(private readonly prisma: PrismaService) {}

  /** Shared WHERE fragments, so the page query and the count cannot diverge. */
  private buildFilters(opts: {
    itemType?: string;
    search?: string;
    startDate?: string;
    endDate?: string;
  }): Prisma.Sql {
    const clauses: Prisma.Sql[] = [Prisma.sql`TRUE`];

    if (opts.itemType) {
      clauses.push(Prisma.sql`r.item_type::text = ${opts.itemType}`);
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
      const pattern = `%${search.replace(/[%_\\]/g, "\\$&")}%`;
      clauses.push(Prisma.sql`(
        u.name ILIKE ${pattern}
        OR u.email ILIKE ${pattern}
        OR r.comment ILIKE ${pattern}
        OR COALESCE(p.title, sv.title) ILIKE ${pattern}
      )`);
    }

    return Prisma.join(clauses, " AND ");
  }

  private readonly joins = Prisma.sql`
    LEFT JOIN users    u  ON u.id  = r.user_id
    LEFT JOIN products p  ON r.item_type::text = 'product' AND p.id  = r.item_id
    LEFT JOIN services sv ON r.item_type::text = 'service' AND sv.id = r.item_id
  `;

  async findForAdmin(opts: {
    skip: number;
    take: number;
    itemType?: string;
    search?: string;
    startDate?: string;
    endDate?: string;
  }): Promise<{ rows: AdminReviewRow[]; total: number }> {
    const where = this.buildFilters(opts);

    const [rows, countRows] = await Promise.all([
      this.prisma.$queryRaw<
        {
          id: string;
          item_id: string;
          item_type: string;
          item_title: string | null;
          request_id: string | null;
          rating: number;
          comment: string | null;
          is_flagged: boolean;
          created_at: Date;
          reviewer_id: string | null;
          reviewer_name: string | null;
          reviewer_email: string | null;
        }[]
      >`
        SELECT r.id,
               r.item_id,
               r.item_type::text AS item_type,
               COALESCE(p.title, sv.title) AS item_title,
               r.request_id,
               r.rating,
               r.comment,
               r.is_flagged,
               r.created_at,
               u.id    AS reviewer_id,
               u.name  AS reviewer_name,
               u.email AS reviewer_email
        FROM reviews r
        ${this.joins}
        WHERE ${where}
        ORDER BY r.created_at DESC
        LIMIT ${opts.take} OFFSET ${opts.skip}
      `,
      this.prisma.$queryRaw<{ total: bigint }[]>`
        SELECT count(*)::bigint AS total
        FROM reviews r
        ${this.joins}
        WHERE ${where}
      `,
    ]);

    return {
      rows: rows.map((r) => ({
        _id: r.id,
        id: r.id,
        itemId: r.item_id,
        itemType: r.item_type as AdminReviewRow["itemType"],
        itemTitle: r.item_title,
        requestId: r.request_id,
        rating: r.rating,
        comment: r.comment,
        isFlagged: r.is_flagged,
        createdAt: r.created_at,
        reviewer: r.reviewer_id
          ? {
              _id: r.reviewer_id,
              id: r.reviewer_id,
              name: r.reviewer_name,
              email: r.reviewer_email as string,
            }
          : null,
      })),
      total: Number(countRows[0]?.total ?? 0),
    };
  }
}
