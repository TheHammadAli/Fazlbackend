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
exports.PromotionService = void 0;
const common_1 = require("@nestjs/common");
const mongoose_1 = require("@nestjs/mongoose");
const mongoose_2 = require("mongoose");
const nestjs_i18n_1 = require("nestjs-i18n");
const promotion_schema_1 = require("./schema/promotion-schema");
let PromotionService = class PromotionService {
    promotionModel;
    i18n;
    constructor(promotionModel, i18n) {
        this.promotionModel = promotionModel;
        this.i18n = i18n;
    }
    async create(dto, lang = "en") {
        if (!["Product", "Shop"].includes(dto.targetType)) {
            throw new common_1.BadRequestException(this.i18n.translate("promotion.invalid_target_type", { lang }));
        }
        return this.promotionModel.create(dto);
    }
    async findAll() {
        return this.promotionModel.find().sort({ createdAt: -1 }).exec();
    }
    async findById(id, lang = "en") {
        if (!mongoose_2.Types.ObjectId.isValid(id))
            throw new common_1.BadRequestException(this.i18n.translate("promotion.invalid_promotion_id", { lang }));
        const promo = await this.promotionModel.findById(id);
        if (!promo)
            throw new common_1.NotFoundException(this.i18n.translate("promotion.promotion_not_found", { lang }));
        return promo;
    }
    async update(id, dto, lang = "en") {
        if (!mongoose_2.Types.ObjectId.isValid(id))
            throw new common_1.BadRequestException(this.i18n.translate("promotion.invalid_promotion_id", { lang }));
        const updated = await this.promotionModel.findByIdAndUpdate(id, dto, {
            new: true,
        });
        if (!updated)
            throw new common_1.NotFoundException(this.i18n.translate("promotion.promotion_not_found", { lang }));
        return updated;
    }
    async delete(id, lang = "en") {
        if (!mongoose_2.Types.ObjectId.isValid(id))
            throw new common_1.BadRequestException(this.i18n.translate("promotion.invalid_promotion_id", { lang }));
        const result = await this.promotionModel.findByIdAndDelete(id);
        if (!result)
            throw new common_1.NotFoundException(this.i18n.translate("promotion.promotion_not_found", { lang }));
    }
    async getFeedPromotions() {
        return this.promotionModel
            .find({ isInFeed: true })
            .sort({ createdAt: -1 })
            .exec();
    }
    async getActivePromotionProductIds() {
        const now = new Date();
        const startOfDay = new Date(now);
        startOfDay.setUTCHours(0, 0, 0, 0);
        const endOfDay = new Date(now);
        endOfDay.setUTCHours(23, 59, 59, 999);
        const promotions = await this.promotionModel
            .find({
            startDate: { $lte: endOfDay },
            endDate: { $gte: startOfDay },
        })
            .lean();
        return promotions.map((p) => p.targetId.toString());
    }
};
exports.PromotionService = PromotionService;
exports.PromotionService = PromotionService = __decorate([
    (0, common_1.Injectable)(),
    __param(0, (0, mongoose_1.InjectModel)(promotion_schema_1.Promotion.name)),
    __metadata("design:paramtypes", [mongoose_2.Model,
        nestjs_i18n_1.I18nService])
], PromotionService);
//# sourceMappingURL=promotion.service.js.map