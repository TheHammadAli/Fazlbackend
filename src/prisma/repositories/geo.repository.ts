import { Injectable } from "@nestjs/common";
import { PrismaService } from "../prisma.service";
import { Prisma } from "../../../generated/prisma/client";

/**
 * Radius search, replacing MongoDB's $geoNear and $near.
 *
 * Prisma has no geo types, so this is the one place raw SQL is unavoidable. It
 * is shared by every located model (shops, products, services, broadcasts,
 * users) rather than repeated per service.
 *
 * The strategy is deliberately two-step:
 *
 *   1. this repository does the geography work in SQL — filter by radius,
 *      compute distance, order, paginate — and returns only ids and distances;
 *   2. the calling service then loads those rows through the normal typed
 *      Prisma client, with whatever `include`s it needs.
 *
 * That keeps the SQL small and reviewable instead of hand-listing every column
 * of a wide table, and keeps relation loading type-safe. The cost is one extra
 * query per search, against a page of ids that is already in memory.
 *
 * `geography` (not `geometry`) is used throughout so ST_DWithin and ST_Distance
 * work in metres on a sphere — matching $geoNear's maxDistance semantics
 * exactly. The `geom` column itself is maintained by trigger from
 * latitude/longitude and is invisible to Prisma.
 */

/** Tables carrying a PostGIS `geom` column. A closed set: the table name is
 *  interpolated into SQL, so it must never come from user input. */
export type GeoTable = "shops" | "products" | "services" | "broadcasts" | "users";

const GEO_TABLES: Record<GeoTable, Prisma.Sql> = {
  shops: Prisma.raw('"shops"'),
  products: Prisma.raw('"products"'),
  services: Prisma.raw('"services"'),
  broadcasts: Prisma.raw('"broadcasts"'),
  users: Prisma.raw('"users"'),
};

/** How the page is ordered. $geoNear returned nearest-first, but several call
 *  sites re-sorted by createdAt afterwards, so both are offered explicitly. */
export type GeoOrder = "distance" | "newest";

export interface GeoSearchResult {
  /** Ids for this page, already in the requested order. */
  ids: string[];
  /** Distance in metres, keyed by id. */
  distances: Map<string, number>;
  /** Total matching rows, ignoring pagination. */
  total: number;
}

@Injectable()
export class GeoRepository {
  constructor(private readonly prisma: PrismaService) {}

  async findNearby(opts: {
    table: GeoTable;
    longitude: number;
    latitude: number;
    radiusMeters: number;
    /** Extra filters, e.g. Prisma.sql`is_deleted = false`. Combined with AND. */
    filters?: Prisma.Sql[];
    skip?: number;
    take?: number;
    order?: GeoOrder;
  }): Promise<GeoSearchResult> {
    const table = GEO_TABLES[opts.table];
    if (!table) {
      // Defensive: the type makes this unreachable, but the value is
      // interpolated into SQL, so it is checked at runtime too.
      throw new Error(`Unknown geo table: ${String(opts.table)}`);
    }

    const point = Prisma.sql`ST_SetSRID(ST_MakePoint(${opts.longitude}, ${opts.latitude}), 4326)::geography`;

    const clauses: Prisma.Sql[] = [
      // Rows with no coordinates have a NULL geom, which ST_DWithin never
      // matches — the same effect as a document with no location field.
      Prisma.sql`geom IS NOT NULL`,
      Prisma.sql`ST_DWithin(geom, ${point}, ${opts.radiusMeters})`,
      ...(opts.filters ?? []),
    ];
    const where = Prisma.join(clauses, " AND ");

    const orderBy =
      opts.order === "newest"
        ? Prisma.sql`created_at DESC`
        : Prisma.sql`distance ASC`;

    const take = opts.take ?? 10;
    const skip = opts.skip ?? 0;

    const [rows, countRows] = await Promise.all([
      this.prisma.$queryRaw<{ id: string; distance: number }[]>`
        SELECT id, ST_Distance(geom, ${point}) AS distance
        FROM ${table}
        WHERE ${where}
        ORDER BY ${orderBy}
        LIMIT ${take} OFFSET ${skip}
      `,
      this.prisma.$queryRaw<{ total: bigint }[]>`
        SELECT count(*)::bigint AS total
        FROM ${table}
        WHERE ${where}
      `,
    ]);

    return {
      ids: rows.map((r) => r.id),
      distances: new Map(rows.map((r) => [r.id, Number(r.distance)])),
      total: Number(countRows[0]?.total ?? 0),
    };
  }

  /**
   * Reorders rows loaded by Prisma back into the order the geo query returned.
   *
   * `findMany({ where: { id: { in: ids } } })` gives no ordering guarantee, so
   * without this the nearest-first (or newest-first) ordering computed in SQL
   * would be silently lost.
   */
  static reorder<T extends { id: string }>(rows: T[], ids: string[]): T[] {
    const byId = new Map(rows.map((r) => [r.id, r]));
    return ids.map((id) => byId.get(id)).filter((r): r is T => r !== undefined);
  }
}
