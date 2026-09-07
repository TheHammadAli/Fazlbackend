import { Injectable } from "@nestjs/common";
import { PaginationDto } from "src/common/dto/pagination.dto";
import { PaginatedResponseDto } from "src/common/dto/pagination-response.dto";
import { PrismaService } from "src/prisma/prisma.service";
import { GeoRepository } from "src/prisma/repositories/geo.repository";
import { withGeoJson } from "src/common/utils/geo.util";
import { Prisma } from "../../generated/prisma/client";
import { resolvePagination } from "../common/utils/pagination.util";

/** The two listing types that support a category-scoped radius search. */
export type ListingTable = "products" | "services";

@Injectable()
export class ListingUtilsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly geoRepository: GeoRepository,
  ) {}

  /**
   * Category-scoped radius search, shared by products and services.
   *
   * Was a $geoNear aggregation taking a Mongoose model, run twice — once for the
   * page and once again purely for a $count. The geography now happens in SQL
   * (see GeoRepository) and the rows come back through the typed client, so the
   * two halves share one WHERE clause and cannot disagree.
   *
   * `radius` is in KILOMETRES here, as it always was — the old code multiplied
   * by 1000 before handing it to $geoNear's maxDistance, which is in metres.
   */
  async findNearbyWithCategory(
    table: ListingTable,
    category: string,
    coordinates: [number, number],
    radius: number,
    pagination: PaginationDto,
  ): Promise<PaginatedResponseDto<any>> {
    const { page: rawPage, limit: rawLimit } = pagination;
    const { page, limit, skip } = resolvePagination(rawPage, rawLimit);
    const [longitude, latitude] = coordinates;

    const { ids, distances, total } = await this.geoRepository.findNearby({
      table,
      longitude,
      latitude,
      radiusMeters: radius * 1000,
      filters: [
        Prisma.sql`category_id = ${category}`,
        Prisma.sql`is_deleted = false`,
        Prisma.sql`is_disabled = false`,
      ],
      skip,
      take: limit,
      // The old pipeline sorted by createdAt after $geoNear rather than by
      // distance; that ordering is preserved.
      order: "newest",
    });

    if (ids.length === 0) {
      return {
        meta: { total, page, limit, totalPages: Math.ceil(total / limit) },
        data: [],
      };
    }

    const rows =
      table === "products"
        ? await this.prisma.product.findMany({
            where: { id: { in: ids } },
            include: { category: true },
          })
        : await this.prisma.service.findMany({
            where: { id: { in: ids } },
            include: { category: true },
          });

    const data = GeoRepository.reorder(rows as { id: string }[], ids).map((row) => ({
      ...withGeoJson(row as any),
      _id: (row as any).id,
      distance: distances.get((row as any).id),
    }));

    return {
      meta: { total, page, limit, totalPages: Math.ceil(total / limit) },
      data,
    };
  }
}
