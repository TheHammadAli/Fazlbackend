import { Model } from "mongoose";
import { Review, ReviewDocument } from "./schema/review.schema";
import { CreateReviewDto } from "./dto/create-review.dto";
import { QueryReviewDto } from "./dto/query-review.dto";
export declare class ReviewService {
    private readonly reviewModel;
    constructor(reviewModel: Model<ReviewDocument>);
    createReview(dto: CreateReviewDto): Promise<Review>;
    getReviews(query: QueryReviewDto): Promise<{
        data: (import("mongoose").Document<unknown, {}, ReviewDocument, {}> & Review & import("mongoose").Document<unknown, any, any, Record<string, any>> & Required<{
            _id: unknown;
        }> & {
            __v: number;
        })[];
        total: number;
        page: number;
        limit: number;
        totalPages: number;
    }>;
    getUserReviews(userId: string): Promise<(import("mongoose").Document<unknown, {}, ReviewDocument, {}> & Review & import("mongoose").Document<unknown, any, any, Record<string, any>> & Required<{
        _id: unknown;
    }> & {
        __v: number;
    })[]>;
    flagReview(id: string): Promise<Review>;
    getAverageRating(itemId: string, itemType: "product" | "service"): Promise<any>;
}
