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
exports.SubscriptionService = void 0;
const common_1 = require("@nestjs/common");
const mongoose_1 = require("@nestjs/mongoose");
const mongoose_2 = require("mongoose");
const subscription_schema_1 = require("./schema/subscription-schema");
let SubscriptionService = class SubscriptionService {
    subscriptionModel;
    constructor(subscriptionModel) {
        this.subscriptionModel = subscriptionModel;
    }
    async create(dto) {
        return this.subscriptionModel.create(dto);
    }
    async findAll() {
        return this.subscriptionModel.find().sort({ createdAt: -1 }).exec();
    }
    async findById(id) {
        if (!mongoose_2.Types.ObjectId.isValid(id))
            throw new common_1.BadRequestException('Invalid subscription ID');
        const sub = await this.subscriptionModel.findById(id);
        if (!sub)
            throw new common_1.NotFoundException('Subscription not found');
        return sub;
    }
    async update(id, dto) {
        if (!mongoose_2.Types.ObjectId.isValid(id))
            throw new common_1.BadRequestException('Invalid subscription ID');
        const updated = await this.subscriptionModel.findByIdAndUpdate(id, dto, { new: true });
        if (!updated)
            throw new common_1.NotFoundException('Subscription not found');
        return updated;
    }
    async delete(id) {
        if (!mongoose_2.Types.ObjectId.isValid(id))
            throw new common_1.BadRequestException('Invalid subscription ID');
        const result = await this.subscriptionModel.findByIdAndDelete(id);
        if (!result)
            throw new common_1.NotFoundException('Subscription not found');
    }
};
exports.SubscriptionService = SubscriptionService;
exports.SubscriptionService = SubscriptionService = __decorate([
    (0, common_1.Injectable)(),
    __param(0, (0, mongoose_1.InjectModel)(subscription_schema_1.Subscription.name)),
    __metadata("design:paramtypes", [mongoose_2.Model])
], SubscriptionService);
//# sourceMappingURL=subscription.service.js.map