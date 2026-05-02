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
exports.CategoryController = void 0;
const common_1 = require("@nestjs/common");
const category_service_1 = require("./category.service");
const category_create_update_dto_1 = require("./dto/category-create-update.dto");
const jwt_auth_guard_1 = require("../auth/guard/jwt-auth-guard");
const category_request_dto_1 = require("./dto/category-request.dto");
const current_user_decorator_1 = require("../common/decorators/current-user.decorator");
const review_category_dto_1 = require("./dto/review-category.dto");
const swagger_1 = require("@nestjs/swagger");
let CategoryController = class CategoryController {
    categoryService;
    constructor(categoryService) {
        this.categoryService = categoryService;
    }
    create(dto) {
        return this.categoryService.create(dto);
    }
    findAll() {
        return this.categoryService.findAll();
    }
    findById(id) {
        return this.categoryService.findById(id);
    }
    update(id, dto) {
        return this.categoryService.update(id, dto);
    }
    delete(id) {
        return this.categoryService.delete(id);
    }
    async createRequest(dto, user) {
        return this.categoryService.createRequest(dto, user.sub);
    }
    async getPendingRequests() {
        return this.categoryService.getPendingRequests();
    }
    async reviewRequest(id, dto, user) {
        return this.categoryService.reviewRequestById(id, dto, user.sub);
    }
};
exports.CategoryController = CategoryController;
__decorate([
    (0, common_1.Post)(),
    (0, swagger_1.ApiOperation)({ summary: "Create a new category (admin only)" }),
    (0, swagger_1.ApiBody)({ type: category_create_update_dto_1.CreateUpdateCategoryDto }),
    (0, swagger_1.ApiResponse)({ status: 201, description: "Category created successfully" }),
    __param(0, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [category_create_update_dto_1.CreateUpdateCategoryDto]),
    __metadata("design:returntype", void 0)
], CategoryController.prototype, "create", null);
__decorate([
    (0, common_1.Get)(),
    (0, swagger_1.ApiOperation)({ summary: "Get all categories" }),
    (0, swagger_1.ApiResponse)({ status: 200, description: "List of categories" }),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", void 0)
], CategoryController.prototype, "findAll", null);
__decorate([
    (0, common_1.Get)("detail/:id"),
    (0, swagger_1.ApiOperation)({ summary: "Get category by ID" }),
    (0, swagger_1.ApiResponse)({ status: 200, description: "Category found" }),
    (0, swagger_1.ApiResponse)({ status: 404, description: "Category not found" }),
    __param(0, (0, common_1.Param)("id")),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", void 0)
], CategoryController.prototype, "findById", null);
__decorate([
    (0, common_1.Put)(":id"),
    (0, swagger_1.ApiOperation)({ summary: "Update an existing category (admin only)" }),
    (0, swagger_1.ApiBody)({ type: category_create_update_dto_1.CreateUpdateCategoryDto }),
    __param(0, (0, common_1.Param)("id")),
    __param(1, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, category_create_update_dto_1.CreateUpdateCategoryDto]),
    __metadata("design:returntype", void 0)
], CategoryController.prototype, "update", null);
__decorate([
    (0, common_1.Delete)(":id"),
    (0, swagger_1.ApiOperation)({ summary: "Delete a category by ID (admin only)" }),
    __param(0, (0, common_1.Param)("id")),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", void 0)
], CategoryController.prototype, "delete", null);
__decorate([
    (0, common_1.Post)("request"),
    (0, swagger_1.ApiOperation)({ summary: "Request a new category (user)" }),
    (0, swagger_1.ApiBody)({ type: category_request_dto_1.CreateCategoryRequestDto }),
    __param(0, (0, common_1.Body)()),
    __param(1, (0, current_user_decorator_1.CurrentUser)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [category_request_dto_1.CreateCategoryRequestDto, Object]),
    __metadata("design:returntype", Promise)
], CategoryController.prototype, "createRequest", null);
__decorate([
    (0, common_1.Get)("pending"),
    (0, swagger_1.ApiOperation)({ summary: "Get all pending category requests (admin only)" }),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", Promise)
], CategoryController.prototype, "getPendingRequests", null);
__decorate([
    (0, common_1.Put)("review/:id"),
    (0, swagger_1.ApiOperation)({ summary: "Review a pending category request (admin only)" }),
    (0, swagger_1.ApiBody)({ type: review_category_dto_1.ReviewCategoryRequestDto }),
    __param(0, (0, common_1.Param)("id")),
    __param(1, (0, common_1.Body)()),
    __param(2, (0, current_user_decorator_1.CurrentUser)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, review_category_dto_1.ReviewCategoryRequestDto, Object]),
    __metadata("design:returntype", Promise)
], CategoryController.prototype, "reviewRequest", null);
exports.CategoryController = CategoryController = __decorate([
    (0, swagger_1.ApiTags)("Categories"),
    (0, swagger_1.ApiBearerAuth)("jwt"),
    (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard),
    (0, common_1.Controller)("categories"),
    __metadata("design:paramtypes", [category_service_1.CategoryService])
], CategoryController);
//# sourceMappingURL=category.controller.js.map