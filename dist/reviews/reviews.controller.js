"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
var __param = (this && this.__param) || function (paramIndex, decorator) {
    return function (target, key) { decorator(target, key, paramIndex); }
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.ReviewController = void 0;
const common_1 = require("@nestjs/common");
const reviews_service_1 = require("./reviews.service");
const create_review_dto_1 = require("./dto/create-review.dto");
const query_review_dto_1 = require("./dto/query-review.dto");
const swagger_1 = require("@nestjs/swagger");
let ReviewController = class ReviewController {
    reviewService;
    constructor(reviewService) {
        this.reviewService = reviewService;
    }
    async createReview(dto) {
        return this.reviewService.createReview(dto);
    }
    async getReviewsByItem(query) {
        return this.reviewService.getReviews(query);
    }
    async getUserReviews(userId) {
        return this.reviewService.getUserReviews(userId);
    }
    async flagReview(id) {
        return this.reviewService.flagReview(id);
    }
    async getAverageRating(itemType, itemId) {
        return this.reviewService.getAverageRating(itemId, itemType);
    }
};
exports.ReviewController = ReviewController;
__decorate([
    (0, common_1.Post)(),
    (0, swagger_1.ApiOperation)({ summary: 'Create a review' }),
    (0, swagger_1.ApiBody)({ type: create_review_dto_1.CreateReviewDto }),
    __param(0, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [create_review_dto_1.CreateReviewDto]),
    __metadata("design:returntype", Promise)
], ReviewController.prototype, "createReview", null);
__decorate([
    (0, common_1.Get)(),
    (0, swagger_1.ApiOperation)({ summary: 'Get paginated reviews for a product or service' }),
    (0, swagger_1.ApiQuery)({ name: 'itemId', required: true }),
    (0, swagger_1.ApiQuery)({ name: 'itemType', enum: ['product', 'service'], required: true }),
    (0, swagger_1.ApiQuery)({ name: 'page', required: false }),
    (0, swagger_1.ApiQuery)({ name: 'limit', required: false }),
    __param(0, (0, common_1.Query)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [query_review_dto_1.QueryReviewDto]),
    __metadata("design:returntype", Promise)
], ReviewController.prototype, "getReviewsByItem", null);
__decorate([
    (0, common_1.Get)('/user/:userId'),
    (0, swagger_1.ApiOperation)({ summary: 'Get all reviews by a user' }),
    (0, swagger_1.ApiParam)({ name: 'userId', required: true }),
    __param(0, (0, common_1.Param)('userId')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", Promise)
], ReviewController.prototype, "getUserReviews", null);
__decorate([
    (0, common_1.Patch)('/:id/flag'),
    (0, swagger_1.ApiOperation)({ summary: 'Flag a review for moderation' }),
    (0, swagger_1.ApiParam)({ name: 'id', required: true }),
    __param(0, (0, common_1.Param)('id')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", Promise)
], ReviewController.prototype, "flagReview", null);
__decorate([
    (0, common_1.Get)('/average/:itemType/:itemId'),
    (0, swagger_1.ApiOperation)({ summary: 'Get average rating and total review count' }),
    (0, swagger_1.ApiParam)({ name: 'itemType', enum: ['product', 'service'] }),
    (0, swagger_1.ApiParam)({ name: 'itemId' }),
    __param(0, (0, common_1.Param)('itemType')),
    __param(1, (0, common_1.Param)('itemId')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String]),
    __metadata("design:returntype", Promise)
], ReviewController.prototype, "getAverageRating", null);
exports.ReviewController = ReviewController = __decorate([
    (0, swagger_1.ApiTags)('Reviews'),
    (0, common_1.Controller)('reviews'),
    __metadata("design:paramtypes", [reviews_service_1.ReviewService])
], ReviewController);
//# sourceMappingURL=reviews.controller.js.map