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
Object.defineProperty(exports, "__esModule", { value: true });
exports.CreatePromotionDto = void 0;
const swagger_1 = require("@nestjs/swagger");
class CreatePromotionDto {
    subscriptionId;
    targetType;
    targetId;
    startDate;
    endDate;
    status;
    isAutoRenew;
}
exports.CreatePromotionDto = CreatePromotionDto;
__decorate([
    (0, swagger_1.ApiProperty)({ type: String, description: "Subscription ID" }),
    __metadata("design:type", String)
], CreatePromotionDto.prototype, "subscriptionId", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({ enum: ["Product", "Shop"], description: "Target type" }),
    __metadata("design:type", String)
], CreatePromotionDto.prototype, "targetType", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({ type: String, description: "Target ID (Product or Shop)" }),
    __metadata("design:type", String)
], CreatePromotionDto.prototype, "targetId", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({ type: String, format: "date-time" }),
    __metadata("design:type", Date)
], CreatePromotionDto.prototype, "startDate", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({ type: String, format: "date-time" }),
    __metadata("design:type", Date)
], CreatePromotionDto.prototype, "endDate", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)({
        enum: ["active", "expired", "cancelled", "scheduled"],
        default: "active",
    }),
    __metadata("design:type", String)
], CreatePromotionDto.prototype, "status", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)({ default: false }),
    __metadata("design:type", Boolean)
], CreatePromotionDto.prototype, "isAutoRenew", void 0);
//# sourceMappingURL=create-promotion.dto.js.map