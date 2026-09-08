// src/reviews/review.service.ts

import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from "@nestjs/common";
import { I18nService } from "nestjs-i18n";
import { ClsService } from "nestjs-cls";
import { PrismaService } from "src/prisma/prisma.service";
import { ReviewRepository } from "src/prisma/repositories/review.repository";
import { generateObjectId } from "src/common/utils/object-id.util";
import { CreateReviewDto } from "./dto/create-review.dto";
import { QueryReviewDto } from "./dto/query-review.dto";
import type { ItemRatingSummary, ItemType, Review } from "./model/review.model";
import type { Prisma } from "../../generated/prisma/client";
import { resolvePagination } from "../common/utils/pagination.util";

/** Accepts ids as strings or as anything stringifiable, since callers on both
 *  sides of the migration pass different shapes. */
function toIds(values: Array<string | { toString(): string }>): string[] {
  return values.map((v) => String(v));
}

@Injectable()
export class ReviewService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly reviewRepository: ReviewRepository,
    private readonly i18n: I18nService,
    private readonly cls: ClsService,
  ) {}

  private get lang(): string {
    return this.cls.get("lang") || "en";
  }

  /**
   * Create a new review. Ensures only one review per user per item — or, when `requestId` is
   * given (services booked more than once), one review per user per booking instead.
   */
  async createReview(
    dto: CreateReviewDto,
  ): Promise<{ message: string; data: { review: Review } }> {
    const existing = await this.prisma.review.findFirst({
      where: {
        userId: dto.userId,
        itemId: dto.itemId,
        itemType: dto.itemType as ItemType,
        ...(dto.requestId ? { requestId: dto.requestId } : {}),
      },
      select: { id: true },
    });

    if (existing) {
      throw new BadRequestException(
        this.i18n.translate("auth.reviews.duplicate_review", { lang: this.lang }),
      );
    }

    const result = await this.prisma.review.create({
      data: {
        id: generateObjectId(),
        userId: dto.userId,
        itemId: dto.itemId,
        itemType: dto.itemType as ItemType,
        ...(dto.requestId ? { requestId: dto.requestId } : {}),
        rating: dto.rating,
        comment: dto.comment ?? null,
      },
    });

    return {
      message: this.i18n.translate("auth.reviews.created_success", { lang: this.lang }),
      data: { review: result },
    };
  }

  /**
   * Paginated review list for a given item (product or service)
   */
  async getReviews(query: QueryReviewDto) {
    const { page: rawPage, limit: rawLimit, itemId, itemType } = query;
    const { page, limit, skip } = resolvePagination(rawPage, rawLimit);
    const where = { itemId, itemType: itemType as ItemType };

    const [reviews, total] = await Promise.all([
      this.prisma.review.findMany({
        where,
        // Was .populate("userId", "name email image"); the relation is named
        // `user`, so it is aliased back to `userId` to keep the response shape.
        include: {
          user: { select: { id: true, name: true, email: true, image: true } },
        },
        orderBy: { createdAt: "desc" },
        skip: (page - 1) * limit,
        take: limit,
      }),
      this.prisma.review.count({ where }),
    ]);

    return {
      data: {
        reviews: reviews.map(({ user, ...r }) => ({ ...r, userId: user })),
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  /**
   * All reviews created by a specific user
   */
  async getUserReviews(
    userId: string,
    rawPage: number | string = 1,
    rawLimit: number | string = 10,
  ) {
    const { page, limit, skip } = resolvePagination(rawPage, rawLimit);
    const where = { userId };

    const [reviews, total] = await Promise.all([
      this.prisma.review.findMany({
        where,
        include: {
          user: { select: { id: true, name: true, email: true, image: true } },
        },
        orderBy: { createdAt: "desc" },
        skip: (page - 1) * limit,
        take: limit,
      }),
      this.prisma.review.count({ where }),
    ]);

    return {
      data: {
        reviews: reviews.map(({ user, ...r }) => ({ ...r, userId: user })),
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  /**
   * Flag a review (e.g., for moderation)
   */
  async flagReview(id: string): Promise<Review> {
    const review = await this.prisma.review.findUnique({ where: { id } });
    if (!review) {
      throw new NotFoundException("Review not found");
    }

    return this.prisma.review.update({ where: { id }, data: { isFlagged: true } });
  }

  /**
   * Get average rating for a specific item
   */
  async getAverageRating(itemId: string, itemType: ItemType) {
    // Was a $group with $avg and $sum; aggregate says it directly.
    const result = await this.prisma.review.aggregate({
      where: { itemId, itemType },
      _avg: { rating: true },
      _count: { _all: true },
    });

    if (result._count._all === 0) {
      return { avgRating: 0, count: 0 };
    }

    return { avgRating: result._avg.rating ?? 0, count: result._count._all };
  }

  async getAverageRatingsForItems(
    itemIds: Array<string | { toString(): string }>,
    itemType: ItemType,
  ): Promise<ItemRatingSummary[]> {
    if (!itemIds || itemIds.length === 0) {
      return [];
    }

    const grouped = await this.prisma.review.groupBy({
      by: ["itemId"],
      where: { itemId: { in: toIds(itemIds) }, itemType },
      _avg: { rating: true },
      _count: { _all: true },
    });

    // `_id` is preserved as the key because both products.service and
    // services.service index the result by it.
    return grouped.map((g) => ({
      _id: g.itemId,
      avgRating: g._avg.rating ?? 0,
      count: g._count._all,
    }));
  }

  /** Ids (from itemIds) that this user has already reviewed — one query, not N+1. */
  async getReviewedItemIdsForUser(
    userId: string,
    itemIds: Array<string | { toString(): string }>,
    itemType: ItemType,
  ): Promise<Set<string>> {
    if (!userId || !itemIds || itemIds.length === 0) {
      return new Set();
    }

    const rows = await this.prisma.review.findMany({
      where: { userId, itemId: { in: toIds(itemIds) }, itemType },
      select: { itemId: true },
    });

    return new Set(rows.map((row) => row.itemId));
  }

  /** Request/booking ids (from requestIds) this user has already left a per-booking review
   *  for — one query, not N+1. Used to compute per-booking `alreadyReviewed` for services that
   *  can be booked more than once. */
  async getReviewedRequestIdsForUser(
    userId: string,
    requestIds: Array<string | { toString(): string }>,
  ): Promise<Set<string>> {
    if (!userId || !requestIds || requestIds.length === 0) {
      return new Set();
    }

    const rows = await this.prisma.review.findMany({
      where: { userId, requestId: { in: toIds(requestIds) } },
      select: { requestId: true },
    });

    return new Set(
      rows.map((row) => row.requestId).filter((id): id is string => Boolean(id)),
    );
  }

  async findOneByRequest(userId: string, requestId: string): Promise<Review | null> {
    return this.prisma.review.findFirst({ where: { userId, requestId } });
  }

  async findOne(
    userId: string,
    itemId: string,
    itemType: ItemType,
  ): Promise<Review | null> {
    return this.prisma.review.findFirst({
      where: { userId, itemId, itemType },
    });
  }

  /** Paginated, filterable review list for the admin Reviews page. The reviewer's name/email and
   *  the reviewed item's title are joined in SQL against users/products/services — see
   *  ReviewRepository. Injecting ProductsService/ServicesService here just for a title would add
   *  a cross-module dependency those modules already point back at via forwardRef. */
  async getAllReviewsForAdmin(
    page = 1,
    limit = 20,
    itemType?: ItemType,
    search?: string,
    startDate?: string,
    endDate?: string,
  ): Promise<{
    data: unknown[];
    meta: { total: number; page: number; limit: number; totalPages: number };
  }> {
    const pageNum = Number(page) || 1;
    const limitNum = Number(limit) || 20;
    const skip = (pageNum - 1) * limitNum;

    const { rows, total } = await this.reviewRepository.findForAdmin({
      skip,
      take: limitNum,
      itemType,
      search,
      startDate,
      endDate,
    });

    return {
      data: rows,
      meta: { total, page: pageNum, limit: limitNum, totalPages: Math.ceil(total / limitNum) },
    };
  }
}
