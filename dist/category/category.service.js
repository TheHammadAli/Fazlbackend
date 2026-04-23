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
exports.CategoryService = void 0;
const common_1 = require("@nestjs/common");
const mongoose_1 = require("@nestjs/mongoose");
const category_schema_1 = require("./schema/category.schema");
const mongoose_2 = require("mongoose");
const nestjs_i18n_1 = require("nestjs-i18n");
const category_request_schema_1 = require("./schema/category-request.schema");
let CategoryService = class CategoryService {
    categoryModel;
    categoryRequestModel;
    i18n;
    constructor(categoryModel, categoryRequestModel, i18n) {
        this.categoryModel = categoryModel;
        this.categoryRequestModel = categoryRequestModel;
        this.i18n = i18n;
    }
    async create(dto) {
        return new this.categoryModel(dto).save();
    }
    async findAll() {
        return this.categoryModel.find().exec();
    }
    async findById(id, lang = "en") {
        const category = await this.categoryModel.findById(id);
        if (!category)
            throw new common_1.NotFoundException(this.i18n.translate("auth.category.category_not_found", { lang }));
        return category;
    }
    async update(id, dto, lang = "en") {
        const updated = await this.categoryModel.findByIdAndUpdate(id, dto, {
            new: true,
        });
        if (!updated)
            throw new common_1.NotFoundException(this.i18n.translate("category.category_not_found", { lang }));
        return updated;
    }
    async delete(id, lang = "en") {
        const result = await this.categoryModel.findByIdAndDelete(id);
        if (!result)
            throw new common_1.NotFoundException(this.i18n.translate("category.category_not_found", { lang }));
    }
    async createRequest(createDto, userId) {
        return this.categoryRequestModel.create({
            ...createDto,
            requestedBy: userId,
        });
    }
    async getPendingRequests() {
        try {
            const results = await this.categoryRequestModel
                .find({ status: "pending" })
                .populate("requestedBy", "name email");
            return results;
        }
        catch (err) {
            console.error("Error populating category requests:", err);
            throw err;
        }
    }
    async reviewRequestById(id, reviewDto, adminId) {
        const request = await this.categoryRequestModel.findById(id);
        if (!request)
            throw new common_1.NotFoundException("Request not found");
        request.status = reviewDto.status;
        request.adminComment = reviewDto.adminComment || "";
        request.reviewedBy = new mongoose_2.Types.ObjectId(adminId);
        request.reviewedAt = new Date();
        await request.save();
        if (reviewDto.status === "approved") {
            await this.categoryModel.create({
                name: request.name,
                description: request.description,
                createdBy: adminId,
            });
        }
        return request;
    }
    async getUserRequests(userId) {
        return this.categoryRequestModel.find({ requestedBy: userId });
    }
};
exports.CategoryService = CategoryService;
exports.CategoryService = CategoryService = __decorate([
    (0, common_1.Injectable)(),
    __param(0, (0, mongoose_1.InjectModel)(category_schema_1.Category.name)),
    __param(1, (0, mongoose_1.InjectModel)(category_request_schema_1.CategoryRequest.name)),
    __metadata("design:paramtypes", [mongoose_2.Model,
        mongoose_2.Model,
        nestjs_i18n_1.I18nService])
], CategoryService);
//# sourceMappingURL=category.service.js.map