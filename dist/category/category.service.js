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
const nestjs_cls_1 = require("nestjs-cls");
let CategoryService = class CategoryService {
    categoryModel;
    categoryRequestModel;
    i18n;
    cls;
    constructor(categoryModel, categoryRequestModel, i18n, cls) {
        this.categoryModel = categoryModel;
        this.categoryRequestModel = categoryRequestModel;
        this.i18n = i18n;
        this.cls = cls;
    }
    getLocalizedValue = (field, lang = "en") => {
        return field?.[lang] || field?.["en"] || "";
    };
    get lang() {
        return this.cls?.get("lang") ?? "en";
    }
    normalizeParameters(parameters) {
        if (!parameters)
            return {};
        if (typeof parameters === "object" && parameters !== null && !Array.isArray(parameters)) {
            return parameters;
        }
        if (typeof parameters === "string") {
            try {
                const parsed = JSON.parse(parameters);
                if (typeof parsed === "object" && parsed !== null && !Array.isArray(parsed)) {
                    return parsed;
                }
            }
            catch (e) {
                throw new common_1.BadRequestException(this.i18n.translate("category.invalid_parameters_format", { lang: this.lang }));
            }
        }
        throw new common_1.BadRequestException(this.i18n.translate("category.invalid_parameters_format", { lang: this.lang }));
    }
    async checkDuplicateName(nameInput, excludeId) {
        let nameEn;
        let nameUr;
        if (typeof nameInput === "object" && nameInput !== null) {
            nameEn = nameInput.en?.trim();
            nameUr = nameInput.ur?.trim();
        }
        else if (typeof nameInput === "string") {
            nameEn = nameInput.trim();
        }
        if (!nameEn && !nameUr)
            return;
        const query = { isDisabled: false };
        if (excludeId) {
            query._id = { $ne: excludeId };
        }
        if (nameEn) {
            const existingEn = await this.categoryModel.findOne({
                ...query,
                "name.en": nameEn,
            });
            if (existingEn) {
                throw new common_1.ConflictException(this.i18n.translate("auth.category.name_already_exists", { lang: this.lang }));
            }
        }
        if (nameUr) {
            const existingUr = await this.categoryModel.findOne({
                ...query,
                "name.ur": nameUr,
            });
            if (existingUr) {
                throw new common_1.ConflictException(this.i18n.translate("auth.category.urdu_name_already_exists", { lang: this.lang }));
            }
        }
    }
    async create(dto) {
        try {
            await this.checkDuplicateName(dto.name);
            const normalizedDto = {
                ...dto,
                parameters: this.normalizeParameters(dto.parameters),
            };
            return await this.categoryModel.create(normalizedDto);
        }
        catch (error) {
            if (error.code === 11000 || error instanceof common_1.ConflictException) {
                throw error;
            }
            if (error.name === "ValidationError") {
                throw new common_1.BadRequestException(this.i18n.translate("category.validation_failed", { lang: this.lang }));
            }
            throw error;
        }
    }
    async update(id, dto) {
        try {
            await this.checkDuplicateName(dto.name, id);
            const normalizedDto = {
                ...dto,
                parameters: this.normalizeParameters(dto.parameters),
            };
            const updated = await this.categoryModel.findByIdAndUpdate(id, normalizedDto, { new: true, runValidators: true });
            if (!updated) {
                throw new common_1.NotFoundException(this.i18n.translate("auth.category.category_not_found", { lang: this.lang }));
            }
            return updated;
        }
        catch (error) {
            if (error.code === 11000 || error instanceof common_1.ConflictException) {
                throw error;
            }
            if (error.name === "ValidationError") {
                throw new common_1.BadRequestException(this.i18n.translate("auth.category.validation_failed", { lang: this.lang }));
            }
            throw error;
        }
    }
    async findAllForAdmin() {
        return this.categoryModel.find().sort({ sortNumber: 1 }).lean().exec();
    }
    async findAll(type) {
        const filter = { isDisabled: false };
        if (type) {
            filter.type = type;
        }
        const categories = await this.categoryModel.find(filter).sort({ sortNumber: 1 }).lean().exec();
        return {
            data: categories.map((cat) => ({
                ...cat,
                name: this.getLocalizedValue(cat?.name, this.lang),
                description: this.getLocalizedValue(cat?.description, this.lang),
            })),
            message: this.i18n.translate("category.fetched_success", { lang: this.lang }),
        };
    }
    async findById(id, lang = "en") {
        const category = await this.categoryModel
            .findOne({ _id: id, isDisabled: false })
            .lean()
            .exec();
        if (!category)
            throw new common_1.NotFoundException(this.i18n.translate("auth.category.category_not_found", { lang }));
        return category;
    }
    async delete(id) {
        const result = await this.categoryModel.findById(id);
        if (!result)
            throw new common_1.NotFoundException(this.i18n.translate("auth.category.category_not_found", { lang: this.lang }));
        await this.categoryModel.updateOne({ _id: id }, { isDisabled: true }).exec();
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
            throw new common_1.NotFoundException(this.i18n.translate("auth.category.request_not_found", { lang: this.lang }));
        request.status = reviewDto.status;
        request.adminComment = reviewDto.adminComment || "";
        request.reviewedBy = new mongoose_2.Types.ObjectId(adminId);
        request.reviewedAt = new Date();
        await request.save();
        if (reviewDto.status === "approved") {
            await this.checkDuplicateName(request.name);
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
        nestjs_i18n_1.I18nService,
        nestjs_cls_1.ClsService])
], CategoryService);
//# sourceMappingURL=category.service.js.map