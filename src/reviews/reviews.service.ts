// src/reviews/review.service.ts

import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from "@nestjs/common";
import { InjectModel } from "@nestjs/mongoose";
import { Model, Types } from "mongoose";
import { Review, ReviewDocument } from "./schema/review.schema";
import { CreateReviewDto } from "./dto/create-review.dto";
import { QueryReviewDto } from "./dto/query-review.dto";

@Injectable()
export class ReviewService {
  constructor(
    @InjectModel(Review.name)
    private readonly reviewModel: Model<ReviewDocument>,
  ) {}

  /**
   * Create a new review. Ensures only one review per user per item.
   */
  async createReview(dto: CreateReviewDto): Promise<Review> {
    const userId = new Types.ObjectId(dto.userId);
    const itemId = new Types.ObjectId(dto.itemId);

    const existing = await this.reviewModel.findOne({
      userId,
      itemId,
      itemType: dto.itemType,
    });

    if (existing) {
      throw new BadRequestException("You have already reviewed this item.");
    }

    const review = new this.reviewModel({
      userId,
      itemId,
      itemType: dto.itemType,
      rating: dto.rating,
      comment: dto.comment,
    });

    return review.save();
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

    const [data, total] = await Promise.all([
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
      data,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    };
  }

  /**
   * All reviews created by a specific user
   */
  async getUserReviews(userId: string) {
    return this.reviewModel
      .find({ userId: new Types.ObjectId(userId) })
      .populate("userId", "name email image")
      .sort({ createdAt: -1 })
      .exec();
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
}
