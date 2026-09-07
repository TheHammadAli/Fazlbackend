import { Injectable } from "@nestjs/common";
import { PrismaService } from "../prisma.service";
import { Prisma } from "../../../generated/prisma/client";

/** One row of the admin unified Feed. */
export interface AdminFeedRow {
  _id: string;
  id: string;
  displayCode: string | null;
  title: string;
  video: string | null;
  images: string[];
  itemType: "shop" | "product" | "service";
  isDisabled: boolean;
  createdAt: Date;
  viewsCount: number;
  category: unknown;
  shopTitle: string | null;
  uploader: { _id: string; id: string; name: string | null; email: string } | null;
}

/**
 * The admin unified Feed: every video across Products (shop-owned or
 * individual) AND Services, including suspended ones, in one sorted list.
 *
 * Replaces a $unionWith aggregation that pulled the services collection into a
 * products pipeline, then applied $addFields/$cond to derive itemType and
 * displayCode, three $lookups (shops, users, categories) and two more
 * sub-pipeline $lookups just to count views — and then ran the entire thing a
 * second time ending in $count.
 *
 * UNION ALL is the direct equivalent and lets both halves be filtered by the
 * same predicate, with the joins applied once to the combined set.
 */
@Injectable()
export class FeedRepository {
  constructor(private readonly prisma: PrismaService) {}

  /** Filters applied identically to both halves of the union. */
  private videoFilters(
    alias: string,
    opts: { search?: string; startDate?: string; endDate?: string },
  ): Prisma.Sql {
    const t = Prisma.raw(alias);
    const clauses: Prisma.Sql[] = [
      // Mongo's { $exists: true, $nin: ["", null] }.
      Prisma.sql`${t}.video IS NOT NULL AND ${t}.video <> ''`,
      Prisma.sql`${t}.is_deleted = false`,
    ];

    const search = opts.search?.trim();
    if (search) {
      const pattern = `%${search.replace(/[%_\\]/g, "\\$&")}%`;
      clauses.push(Prisma.sql`${t}.title ILIKE ${pattern}`);
    }
    if (opts.startDate) {
      clauses.push(Prisma.sql`${t}.created_at >= ${new Date(opts.startDate)}`);
    }
    if (opts.endDate) {
      const endOfDay = new Date(opts.endDate);
      endOfDay.setHours(23, 59, 59, 999);
      clauses.push(Prisma.sql`${t}.created_at <= ${endOfDay}`);
    }

    return Prisma.join(clauses, " AND ");
  }

  async findForAdmin(opts: {
    skip: number;
    take: number;
    search?: string;
    startDate?: string;
    endDate?: string;
  }): Promise<{ rows: AdminFeedRow[]; total: number }> {
    const productWhere = this.videoFilters("p", opts);
    const serviceWhere = this.videoFilters("s", opts);

    // Both halves must project the same columns in the same order for UNION ALL.
    const union = Prisma.sql`
      SELECT p.id,
             p.video_code AS display_code,
             p.title,
             p.video,
             p.images,
             CASE WHEN p.shop_id IS NOT NULL THEN 'shop' ELSE 'product' END AS item_type,
             p.is_disabled,
             p.created_at,
             p.category_id,
             p.shop_id,
             p.owner_id
      FROM products p
      WHERE ${productWhere}

      UNION ALL

      SELECT s.id,
             s.service_code AS display_code,
             s.title,
             s.video,
             s.images,
             'service' AS item_type,
             s.is_disabled,
             s.created_at,
             s.category_id,
             NULL AS shop_id,
             s.owner_id
      FROM services s
      WHERE ${serviceWhere}
    `;

    const [rows, countRows] = await Promise.all([
      this.prisma.$queryRaw<
        {
          id: string;
          display_code: string | null;
          title: string;
          video: string | null;
          images: string[];
          item_type: string;
          is_disabled: boolean;
          created_at: Date;
          views_count: number;
          category_id: string | null;
          category_name: unknown;
          shop_title: string | null;
          uploader_id: string | null;
          uploader_name: string | null;
          uploader_email: string | null;
        }[]
      >`
        WITH feed AS (${union})
        SELECT f.id,
               f.display_code,
               f.title,
               f.video,
               f.images,
               f.item_type,
               f.is_disabled,
               f.created_at,
               f.category_id,
               c.name AS category_name,
               sh.title AS shop_title,
               u.id    AS uploader_id,
               u.name  AS uploader_name,
               u.email AS uploader_email,
               COALESCE(
                 CASE WHEN f.item_type = 'service'
                      THEN (SELECT count(*) FROM service_views sv WHERE sv.service_id = f.id)
                      ELSE (SELECT count(*) FROM product_views pv WHERE pv.product_id = f.id)
                 END, 0
               )::int AS views_count
        FROM feed f
        LEFT JOIN shops sh ON sh.id = f.shop_id
        LEFT JOIN categories c ON c.id = f.category_id
        -- A shop's video resolves to the shop owner; an individual listing to
        -- its own ownerId. COALESCE is the $ifNull the pipeline used.
        LEFT JOIN users u ON u.id = COALESCE(sh.owner_id, f.owner_id)
        ORDER BY f.created_at DESC
        LIMIT ${opts.take} OFFSET ${opts.skip}
      `,
      this.prisma.$queryRaw<{ total: bigint }[]>`
        WITH feed AS (${union})
        SELECT count(*)::bigint AS total FROM feed
      `,
    ]);

    return {
      rows: rows.map((r) => ({
        _id: r.id,
        id: r.id,
        displayCode: r.display_code,
        title: r.title,
        video: r.video,
        images: r.images ?? [],
        itemType: r.item_type as AdminFeedRow["itemType"],
        isDisabled: r.is_disabled,
        createdAt: r.created_at,
        viewsCount: Number(r.views_count),
        category: r.category_id
          ? { _id: r.category_id, id: r.category_id, name: r.category_name }
          : null,
        shopTitle: r.shop_title,
        uploader: r.uploader_id
          ? {
              _id: r.uploader_id,
              id: r.uploader_id,
              name: r.uploader_name,
              email: r.uploader_email as string,
            }
          : null,
      })),
      total: Number(countRows[0]?.total ?? 0),
    };
  }

  /**
   * User ids to notify about a broadcast: the owners of listings in a category
   * within a radius.
   *
   * Replaces a $geoNear + $lookup(shops) + $project($ifNull) + $group pipeline.
   * A shop's listing resolves to the shop's owner, an individual listing to its
   * own ownerId — COALESCE does what $ifNull did.
   */
  async findNearbyListingOwnerIds(opts: {
    table: "products" | "services";
    categoryId: string;
    longitude: number;
    latitude: number;
    radiusMeters: number;
  }): Promise<string[]> {
    const point = Prisma.sql`ST_SetSRID(ST_MakePoint(${opts.longitude}, ${opts.latitude}), 4326)::geography`;

    if (opts.table === "services") {
      const rows = await this.prisma.$queryRaw<{ owner_id: string }[]>`
        SELECT DISTINCT s.owner_id
        FROM services s
        WHERE s.geom IS NOT NULL
          AND ST_DWithin(s.geom, ${point}, ${opts.radiusMeters})
          AND s.category_id = ${opts.categoryId}
          AND s.is_deleted = false
          AND s.is_disabled = false
          AND s.owner_id IS NOT NULL
      `;
      return rows.map((r) => r.owner_id);
    }

    const rows = await this.prisma.$queryRaw<{ owner_id: string }[]>`
      SELECT DISTINCT COALESCE(sh.owner_id, p.owner_id) AS owner_id
      FROM products p
      LEFT JOIN shops sh ON sh.id = p.shop_id
      WHERE p.geom IS NOT NULL
        AND ST_DWithin(p.geom, ${point}, ${opts.radiusMeters})
        AND p.category_id = ${opts.categoryId}
        AND p.is_deleted = false
        AND p.is_disabled = false
        AND COALESCE(sh.owner_id, p.owner_id) IS NOT NULL
    `;
    return rows.map((r) => r.owner_id);
  }
}
