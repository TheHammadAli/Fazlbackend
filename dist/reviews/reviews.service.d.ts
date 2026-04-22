import { Model } from "mongoose";
import { I18nService } from "nestjs-i18n";
import { Review, ReviewDocument } from "./schema/review.schema";
import { CreateReviewDto } from "./dto/create-review.dto";
import { QueryReviewDto } from "./dto/query-review.dto";
import { ClsService } from "nestjs-cls";
export declare class ReviewService {
    private readonly reviewModel;
    private readonly i18n;
    private readonly cls;
    constructor(reviewModel: Model<ReviewDocument>, i18n: I18nService, cls: ClsService);
    private get lang();
    createReview(dto: CreateReviewDto, lang?: string): Promise<Review>;
    getReviews(query: QueryReviewDto): Promise<{
        data: {
            reviews: (import("mongoose").Document<unknown, {}, ReviewDocument, {}> & Review & import("mongoose").Document<unknown, any, any, Record<string, any>> & Required<{
                _id: unknown;
            }> & {
                __v: number;
            })[];
            total: number;
            page: number;
            limit: number;
            totalPages: number;
        };
    }>;
    getUserReviews(userId: string, page?: number, limit?: number): Promise<{
        data: {
            reviews: (import("mongoose").Document<unknown, {}, ReviewDocument, {}> & Review & import("mongoose").Document<unknown, any, any, Record<string, any>> & Required<{
                _id: unknown;
            }> & {
                __v: number;
            })[];
            total: number;
            page: number;
            limit: number;
            totalPages: number;
        };
    }>;
    flagReview(id: string): Promise<Review>;
    getAverageRating(itemId: string, itemType: "product" | "service"): Promise<any>;
}
