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
exports.ReviewService = void 0;
const common_1 = require("@nestjs/common");
const mongoose_1 = require("@nestjs/mongoose");
const mongoose_2 = require("mongoose");
const nestjs_i18n_1 = require("nestjs-i18n");
const review_schema_1 = require("./schema/review.schema");
const nestjs_cls_1 = require("nestjs-cls");
let ReviewService = class ReviewService {
    reviewModel;
    i18n;
    cls;
    constructor(reviewModel, i18n, cls) {
        this.reviewModel = reviewModel;
        this.i18n = i18n;
        this.cls = cls;
    }
    get lang() {
        return this.cls.get("lang") || "en";
    }
    async createReview(dto, lang = "en") {
        const userId = new mongoose_2.Types.ObjectId(dto.userId);
        const itemId = new mongoose_2.Types.ObjectId(dto.itemId);
        const existing = await this.reviewModel.findOne({
            userId,
            itemId,
            itemType: dto.itemType,
        });
        if (existing) {
            throw new common_1.BadRequestException(this.i18n.translate("reviews.duplicate_review", { lang }));
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
    async getReviews(query) {
        const { itemId, itemType, page = 1, limit = 10 } = query;
        const filter = {
            itemId: new mongoose_2.Types.ObjectId(itemId),
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
    async getUserReviews(userId, page = 1, limit = 10) {
        const [reviews, total] = await Promise.all([
            this.reviewModel
                .find({ userId: new mongoose_2.Types.ObjectId(userId) })
                .populate("userId", "name email image")
                .sort({ createdAt: -1 })
                .skip((page - 1) * limit)
                .limit(limit)
                .exec(),
            this.reviewModel.countDocuments({ userId: new mongoose_2.Types.ObjectId(userId) }),
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
    async flagReview(id) {
        const review = await this.reviewModel.findById(id);
        if (!review) {
            throw new common_1.NotFoundException("Review not found");
        }
        review.isFlagged = true;
        return review.save();
    }
    async getAverageRating(itemId, itemType) {
        const result = await this.reviewModel.aggregate([
            {
                $match: {
                    itemId: new mongoose_2.Types.ObjectId(itemId),
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
};
exports.ReviewService = ReviewService;
exports.ReviewService = ReviewService = __decorate([
    (0, common_1.Injectable)(),
    __param(0, (0, mongoose_1.InjectModel)(review_schema_1.Review.name)),
    __metadata("design:paramtypes", [mongoose_2.Model,
        nestjs_i18n_1.I18nService,
        nestjs_cls_1.ClsService])
], ReviewService);
//# sourceMappingURL=reviews.service.js.map