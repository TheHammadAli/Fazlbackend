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
const promotion_schema_1 = require("./schema/promotion-schema");
let PromotionService = class PromotionService {
    promotionModel;
    constructor(promotionModel) {
        this.promotionModel = promotionModel;
    }
    async create(dto) {
        if (!['Product', 'Shop'].includes(dto.targetType)) {
            throw new common_1.BadRequestException('Invalid targetType');
        }
        return this.promotionModel.create(dto);
    }
    async findAll() {
        return this.promotionModel.find().sort({ createdAt: -1 }).exec();
    }
    async findById(id) {
        if (!mongoose_2.Types.ObjectId.isValid(id))
            throw new common_1.BadRequestException('Invalid promotion ID');
        const promo = await this.promotionModel.findById(id);
        if (!promo)
            throw new common_1.NotFoundException('Promotion not found');
        return promo;
    }
    async update(id, dto) {
        if (!mongoose_2.Types.ObjectId.isValid(id))
            throw new common_1.BadRequestException('Invalid promotion ID');
        const updated = await this.promotionModel.findByIdAndUpdate(id, dto, { new: true });
        if (!updated)
            throw new common_1.NotFoundException('Promotion not found');
        return updated;
    }
    async delete(id) {
        if (!mongoose_2.Types.ObjectId.isValid(id))
            throw new common_1.BadRequestException('Invalid promotion ID');
        const result = await this.promotionModel.findByIdAndDelete(id);
        if (!result)
            throw new common_1.NotFoundException('Promotion not found');
    }
};
exports.PromotionService = PromotionService;
exports.PromotionService = PromotionService = __decorate([
    (0, common_1.Injectable)(),
    __param(0, (0, mongoose_1.InjectModel)(promotion_schema_1.Promotion.name)),
    __metadata("design:paramtypes", [mongoose_2.Model])
], PromotionService);
//# sourceMappingURL=promotion.service.js.map