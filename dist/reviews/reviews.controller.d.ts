import { ReviewService } from './reviews.service';
import { CreateReviewDto } from './dto/create-review.dto';
import { QueryReviewDto } from './dto/query-review.dto';
export declare class ReviewController {
    private readonly reviewService;
    constructor(reviewService: ReviewService);
    createReview(dto: CreateReviewDto): Promise<import("./schema/review.schema").Review>;
    getReviewsByItem(query: QueryReviewDto): Promise<{
        data: (import("mongoose").FlattenMaps<import("./schema/review.schema").ReviewDocument> & Required<{
            _id: import("mongoose").FlattenMaps<unknown>;
        }> & {
            __v: number;
        })[];
        total: number;
        page: number;
        limit: number;
        totalPages: number;
    }>;
    getUserReviews(userId: string): Promise<(import("mongoose").FlattenMaps<import("./schema/review.schema").ReviewDocument> & Required<{
        _id: import("mongoose").FlattenMaps<unknown>;
    }> & {
        __v: number;
    })[]>;
    flagReview(id: string): Promise<import("./schema/review.schema").Review>;
    getAverageRating(itemType: 'product' | 'service', itemId: string): Promise<any>;
}
