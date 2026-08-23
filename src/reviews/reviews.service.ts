// src/reviews/review.service.ts

import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from "@nestjs/common";
import { InjectModel } from "@nestjs/mongoose";
import { Model, Types } from "mongoose";
import { I18nService } from "nestjs-i18n";
import { Review, ReviewDocument } from "./schema/review.schema";
import { CreateReviewDto } from "./dto/create-review.dto";
import { QueryReviewDto } from "./dto/query-review.dto";
import { ClsService } from "nestjs-cls";
@Injectable()
export class ReviewService {
  constructor(
    @InjectModel(Review.name)
    private readonly reviewModel: Model<ReviewDocument>,
    private readonly i18n: I18nService,
    private readonly cls: ClsService,
  ) { }

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
    const userId = new Types.ObjectId(dto.userId);
    const itemId = new Types.ObjectId(dto.itemId);
    const requestId = dto.requestId ? new Types.ObjectId(dto.requestId) : undefined;

    const duplicateFilter: Record<string, unknown> = {
      userId,
      itemId,
      itemType: dto.itemType,
    };
    if (requestId) {
      duplicateFilter.requestId = requestId;
    }

    const existing = await this.reviewModel.findOne(duplicateFilter);

    if (existing) {
      throw new BadRequestException(
        this.i18n.translate("auth.reviews.duplicate_review", {
          lang: this.lang,
        }),
      );
    }

    const review = new this.reviewModel({
      userId,
      itemId,
      itemType: dto.itemType,
      ...(requestId ? { requestId } : {}),
      rating: dto.rating,
      comment: dto.comment,
    });

    const result = await review.save();
    return {
      message: this.i18n.translate("auth.reviews.created_success", {
        lang: this.lang,
      }),
      data: { review: result },
    };
  }

  /**
   * Paginated review list for a given item (product or service)
   */
  async getReviews(query: QueryReviewDto) {
    const { itemId, itemType, page = 1, limit = 10 } = query;

    const filter = {
      itemId: new Types.ObjectId(itemId),
      itemType,
    };

    const [reviews, total] = await Promise.all([
      this.reviewModel
        .find(filter)
        .populate("userId", "name email image")
        .sort({ createdAt: -1 })
        .skip((page - 1) * limit)
        .limit(limit)
        .exec(),
      this.reviewModel.countDocuments(filter),
    ]);

    return {
      data: {
        reviews,
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
  async getUserReviews(userId: string, page: number = 1, limit: number = 10) {
    const [reviews, total] = await Promise.all([
      this.reviewModel
        .find({ userId: new Types.ObjectId(userId) })
        .populate("userId", "name email image")
        .sort({ createdAt: -1 })
        .skip((page - 1) * limit)
        .limit(limit)
        .exec(),
      this.reviewModel.countDocuments({ userId: new Types.ObjectId(userId) }),
    ]);

    return {
      data: {
        reviews,
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
    const review = await this.reviewModel.findById(id);
    if (!review) {
      throw new NotFoundException("Review not found");
    }

    review.isFlagged = true;
    return review.save();
  }

  /**
   * Get average rating for a specific item
   */
  async getAverageRating(itemId: string, itemType: "product" | "service") {
    const result = await this.reviewModel.aggregate([
      {
        $match: {
          itemId: new Types.ObjectId(itemId),
          itemType,
        },
      },
      {
        $group: {
          _id: null,
          avgRating: { $avg: "$rating" },
          count: { $sum: 1 },
        },
      },
    ]);

    return result[0] || { avgRating: 0, count: 0 };
  }

  async getAverageRatingsForItems(
    itemIds: Array<string | Types.ObjectId>,
    itemType: "product" | "service",
  ) {
    if (!itemIds || itemIds.length === 0) {
      return [];
    }

    const objectIds = itemIds.map((itemId) =>
      itemId instanceof Types.ObjectId ? itemId : new Types.ObjectId(itemId),
    );

    return this.reviewModel.aggregate([
      {
        $match: {
          itemId: { $in: objectIds },
          itemType,
        },
      },
      {
        $group: {
          _id: "$itemId",
          avgRating: { $avg: "$rating" },
          count: { $sum: 1 },
        },
      },
    ]);
  }

  /** Ids (from itemIds) that this user has already reviewed — one query, not N+1. */
  async getReviewedItemIdsForUser(
    userId: string,
    itemIds: Array<string | Types.ObjectId>,
    itemType: "product" | "service",
  ): Promise<Set<string>> {
    if (!userId || !itemIds || itemIds.length === 0) {
      return new Set();
    }

    const objectIds = itemIds.map((itemId) =>
      itemId instanceof Types.ObjectId ? itemId : new Types.ObjectId(itemId),
    );

    const docs = await this.reviewModel
      .find({
        userId: new Types.ObjectId(userId),
        itemId: { $in: objectIds },
        itemType,
      })
      .select("itemId")
      .lean();

    return new Set(docs.map((doc) => doc.itemId.toString()));
  }

  /** Request/booking ids (from requestIds) this user has already left a per-booking review
   *  for — one query, not N+1. Used to compute per-booking `alreadyReviewed` for services that
   *  can be booked more than once. */
  async getReviewedRequestIdsForUser(
    userId: string,
    requestIds: Array<string | Types.ObjectId>,
  ): Promise<Set<string>> {
    if (!userId || !requestIds || requestIds.length === 0) {
      return new Set();
    }

    const objectIds = requestIds.map((requestId) =>
      requestId instanceof Types.ObjectId ? requestId : new Types.ObjectId(requestId),
    );

    const docs = await this.reviewModel
      .find({
        userId: new Types.ObjectId(userId),
        requestId: { $in: objectIds },
      })
      .select("requestId")
      .lean();

    return new Set(
      docs
        .map((doc) => doc.requestId?.toString())
        .filter((id): id is string => Boolean(id)),
    );
  }

  async findOneByRequest(userId: string, requestId: string): Promise<Review | null> {
    return this.reviewModel.findOne({
      userId: new Types.ObjectId(userId),
      requestId: new Types.ObjectId(requestId),
    });
  }

  async findOne(
    userId: string,
    itemId: string,
    itemType: "product" | "service",
  ): Promise<Review | null> {
    return this.reviewModel.findOne({
      userId: new Types.ObjectId(userId),
      itemId: new Types.ObjectId(itemId),
      itemType,
    });
  }

  /** Paginated, filterable review list for the admin Reviews page. Reviewer name/email and the
   *  reviewed item's title are joined in via `$lookup` directly against the "users" / "products"
   *  / "services" collections — cheaper than injecting ProductsService/ServicesService here just
   *  for a title, and avoids a new cross-module dependency (those modules already depend back on
   *  ReviewsModule via forwardRef). Only one of productInfo/serviceInfo will ever match per row,
   *  picked by `itemType`. */
  async getAllReviewsForAdmin(
    page = 1,
    limit = 20,
    itemType?: "product" | "service",
    search?: string,
  ): Promise<{
    data: unknown[];
    meta: { total: number; page: number; limit: number; totalPages: number };
  }> {
    const pageNum = Number(page) || 1;
    const limitNum = Number(limit) || 20;
    const skip = (pageNum - 1) * limitNum;

    const match: Record<string, unknown> = {};
    if (itemType) match.itemType = itemType;

    const basePipeline: any[] = [
      { $match: match },
      {
        $lookup: {
          from: "users",
          localField: "userId",
          foreignField: "_id",
          as: "reviewer",
        },
      },
      { $unwind: { path: "$reviewer", preserveNullAndEmptyArrays: true } },
      {
        $lookup: {
          from: "products",
          localField: "itemId",
          foreignField: "_id",
          as: "productInfo",
        },
      },
      {
        $lookup: {
          from: "services",
          localField: "itemId",
          foreignField: "_id",
          as: "serviceInfo",
        },
      },
      {
        $addFields: {
          itemTitle: {
            $cond: [
              { $eq: ["$itemType", "product"] },
              { $arrayElemAt: ["$productInfo.title", 0] },
              { $arrayElemAt: ["$serviceInfo.title", 0] },
            ],
          },
        },
      },
    ];

    if (search?.trim()) {
      const escaped = search.trim().replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
      const regex = { $regex: escaped, $options: "i" };
      basePipeline.push({
        $match: {
          $or: [
            { "reviewer.name": regex },
            { "reviewer.email": regex },
            { comment: regex },
            { itemTitle: regex },
          ],
        },
      });
    }

    const [rows, countResult] = await Promise.all([
      this.reviewModel
        .aggregate([
          ...basePipeline,
          { $sort: { createdAt: -1 } },
          { $skip: skip },
          { $limit: limitNum },
          {
            $project: {
              itemId: 1,
              itemType: 1,
              itemTitle: 1,
              requestId: 1,
              rating: 1,
              comment: 1,
              isFlagged: 1,
              createdAt: 1,
              "reviewer._id": 1,
              "reviewer.name": 1,
              "reviewer.email": 1,
            },
          },
        ])
        .exec(),
      this.reviewModel.aggregate([...basePipeline, { $count: "total" }]).exec(),
    ]);

    const total = countResult[0]?.total ?? 0;

    return {
      data: rows,
      meta: { total, page: pageNum, limit: limitNum, totalPages: Math.ceil(total / limitNum) },
    };
  }
}
