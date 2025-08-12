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
exports.PromotionSchema = exports.Promotion = void 0;
const mongoose_1 = require("@nestjs/mongoose");
const mongoose_2 = require("mongoose");
let Promotion = class Promotion extends mongoose_2.Document {
    subscriptionId;
    targetType;
    targetId;
    startDate;
    endDate;
    status;
    isAutoRenew;
    isInFeed;
};
exports.Promotion = Promotion;
__decorate([
    (0, mongoose_1.Prop)({ required: true, type: mongoose_2.default.Schema.Types.ObjectId, ref: 'Subscription' }),
    __metadata("design:type", mongoose_2.Types.ObjectId)
], Promotion.prototype, "subscriptionId", void 0);
__decorate([
    (0, mongoose_1.Prop)({ required: true, enum: ['Product', 'Shop', 'Service'] }),
    __metadata("design:type", String)
], Promotion.prototype, "targetType", void 0);
__decorate([
    (0, mongoose_1.Prop)({ required: true, type: mongoose_2.default.Schema.Types.ObjectId, refPath: 'targetType' }),
    __metadata("design:type", mongoose_2.Types.ObjectId)
], Promotion.prototype, "targetId", void 0);
__decorate([
    (0, mongoose_1.Prop)({ required: true }),
    __metadata("design:type", Date)
], Promotion.prototype, "startDate", void 0);
__decorate([
    (0, mongoose_1.Prop)({ required: true }),
    __metadata("design:type", Date)
], Promotion.prototype, "endDate", void 0);
__decorate([
    (0, mongoose_1.Prop)({ default: 'active', enum: ['active', 'expired', 'cancelled', 'scheduled'] }),
    __metadata("design:type", String)
], Promotion.prototype, "status", void 0);
__decorate([
    (0, mongoose_1.Prop)({ default: false }),
    __metadata("design:type", Boolean)
], Promotion.prototype, "isAutoRenew", void 0);
__decorate([
    (0, mongoose_1.Prop)({ default: false }),
    __metadata("design:type", Boolean)
], Promotion.prototype, "isInFeed", void 0);
exports.Promotion = Promotion = __decorate([
    (0, mongoose_1.Schema)({ timestamps: true })
], Promotion);
exports.PromotionSchema = mongoose_1.SchemaFactory.createForClass(Promotion);
//# sourceMappingURL=promotion-schema.js.map