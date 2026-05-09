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
exports.ProductsController = void 0;
const common_1 = require("@nestjs/common");
const products_service_1 = require("./products.service");
const create_product_dto_1 = require("./dto/create-product.dto");
const update_product_dto_1 = require("./dto/update-product.dto");
const pagination_dto_1 = require("../common/dto/pagination.dto");
const platform_express_1 = require("@nestjs/platform-express");
const jwt_auth_guard_1 = require("../auth/guard/jwt-auth-guard");
const swagger_1 = require("@nestjs/swagger");
const current_user_decorator_1 = require("../common/decorators/current-user.decorator");
const public_decorator_1 = require("../common/decorators/public.decorator");
const video_with_dto_1 = require("../services/dto/video-with-dto");
let ProductsController = class ProductsController {
    productsService;
    constructor(productsService) {
        this.productsService = productsService;
    }
    async createProduct(entityId, type, req, createProductDto, files) {
        if (files?.images && files.images.length > 0) {
            createProductDto.images = files.images;
        }
        else {
            createProductDto.images = [];
        }
        if (files?.video && files.video.length > 0) {
            createProductDto.video = files.video[0];
        }
        else {
            createProductDto.video = null;
        }
        createProductDto.parameters = JSON.parse(createProductDto.parameters?.toString() || "{}");
        return this.productsService.create(entityId, type, createProductDto);
    }
    async getAllByShop(shopId, paginationDto) {
        return this.productsService.getAllProductsByShop(shopId, paginationDto);
    }
    async deleteProductMedia(productId, media) {
        if (!Array.isArray(media) || media.length === 0) {
            throw new common_1.BadRequestException("No media files provided for deletion");
        }
        await this.productsService.deleteProductMedia(productId, media);
        return { message: "Selected product media deleted successfully" };
    }
    async getAllProductsByUser(userId, paginationDto) {
        return this.productsService.getAllProductsByUser(userId, paginationDto);
    }
    async getProductsWithVideos(query, userId) {
        return this.productsService.getProductsWithVideos(query, userId, query.category);
    }
    async getById(id) {
        return this.productsService.getById(id);
    }
    async update(id, updateProductDto, files) {
        if (files?.images && files.images.length > 0) {
            updateProductDto.images = files.images;
        }
        if (files?.video && files.video.length > 0) {
            updateProductDto.video = files.video[0];
        }
        updateProductDto.parameters = JSON.parse(updateProductDto.parameters?.toString() || "");
        return this.productsService.update(id, updateProductDto);
    }
    async delete(id) {
        await this.productsService.delete(id);
        return { message: "Product deleted successfully" };
    }
};
exports.ProductsController = ProductsController;
__decorate([
    (0, common_1.Post)(":entityId/:type"),
    (0, common_1.UseInterceptors)((0, platform_express_1.FileFieldsInterceptor)([
        { name: "images", maxCount: 5 },
        { name: "video", maxCount: 1 },
    ])),
    (0, swagger_1.ApiOperation)({ summary: "Create a new product (shop or personal listing)" }),
    (0, swagger_1.ApiConsumes)("multipart/form-data"),
    (0, swagger_1.ApiParam)({
        name: "entityId",
        required: true,
        description: "Shop ID or User ID depending on type",
    }),
    (0, swagger_1.ApiParam)({
        name: "type",
        required: true,
        description: `'shop' for business listings, 'personal' for user-created listings`,
        enum: ["shop", "personal"],
    }),
    (0, swagger_1.ApiBody)({
        description: "Product data with optional image upload",
        type: create_product_dto_1.CreateProductDto,
    }),
    __param(0, (0, common_1.Param)("entityId")),
    __param(1, (0, common_1.Param)("type")),
    __param(2, (0, common_1.Req)()),
    __param(3, (0, common_1.Body)()),
    __param(4, (0, common_1.UploadedFiles)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String, Object, create_product_dto_1.CreateProductDto, Object]),
    __metadata("design:returntype", Promise)
], ProductsController.prototype, "createProduct", null);
__decorate([
    (0, public_decorator_1.Public)(),
    (0, common_1.Get)("shop/:shopId"),
    (0, swagger_1.ApiOperation)({ summary: "Get all products for a shop" }),
    (0, swagger_1.ApiParam)({ name: "shopId", required: true }),
    (0, swagger_1.ApiQuery)({ name: "page", required: false }),
    (0, swagger_1.ApiQuery)({ name: "limit", required: false }),
    __param(0, (0, common_1.Param)("shopId")),
    __param(1, (0, common_1.Query)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, pagination_dto_1.PaginationDto]),
    __metadata("design:returntype", Promise)
], ProductsController.prototype, "getAllByShop", null);
__decorate([
    (0, common_1.Delete)(":id/media"),
    (0, swagger_1.ApiOperation)({ summary: "Delete selected media files for a product" }),
    (0, swagger_1.ApiParam)({ name: "id", description: "Product ID" }),
    (0, swagger_1.ApiBody)({
        schema: {
            properties: {
                media: {
                    type: "array",
                    items: { type: "string" },
                    description: "Array of media file URLs to delete",
                },
            },
            required: ["media"],
        },
    }),
    (0, swagger_1.ApiResponse)({
        status: 200,
        description: "Selected product media deleted successfully",
    }),
    (0, swagger_1.ApiResponse)({ status: 404, description: "Product not found" }),
    (0, swagger_1.ApiResponse)({
        status: 400,
        description: "No media files provided for deletion",
    }),
    (0, common_1.HttpCode)(common_1.HttpStatus.OK),
    __param(0, (0, common_1.Param)("id")),
    __param(1, (0, common_1.Body)("media")),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Array]),
    __metadata("design:returntype", Promise)
], ProductsController.prototype, "deleteProductMedia", null);
__decorate([
    (0, common_1.Get)("user/:userId"),
    (0, public_decorator_1.Public)(),
    (0, swagger_1.ApiOperation)({ summary: "Get all products for a User" }),
    (0, swagger_1.ApiParam)({ name: "userId", required: true }),
    (0, swagger_1.ApiQuery)({ name: "page", required: false }),
    (0, swagger_1.ApiQuery)({ name: "limit", required: false }),
    __param(0, (0, common_1.Param)("userId")),
    __param(1, (0, common_1.Query)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, pagination_dto_1.PaginationDto]),
    __metadata("design:returntype", Promise)
], ProductsController.prototype, "getAllProductsByUser", null);
__decorate([
    (0, common_1.Get)("with-videos/all"),
    (0, public_decorator_1.Public)(),
    (0, swagger_1.ApiOperation)({ summary: "Get all products with videos (paginated)" }),
    (0, swagger_1.ApiResponse)({
        status: 200,
        description: "Paginated list of products with videos",
    }),
    __param(0, (0, common_1.Query)()),
    __param(1, (0, current_user_decorator_1.CurrentUser)("sub")),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [video_with_dto_1.GetWithVideosDto, String]),
    __metadata("design:returntype", Promise)
], ProductsController.prototype, "getProductsWithVideos", null);
__decorate([
    (0, common_1.Get)("detail/:id"),
    (0, public_decorator_1.Public)(),
    (0, swagger_1.ApiOperation)({ summary: "Get product details by ID" }),
    (0, swagger_1.ApiParam)({ name: "id", required: true }),
    __param(0, (0, common_1.Param)("id")),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", Promise)
], ProductsController.prototype, "getById", null);
__decorate([
    (0, common_1.Put)(":id"),
    (0, swagger_1.ApiOperation)({ summary: "Update product by ID" }),
    (0, swagger_1.ApiConsumes)("multipart/form-data"),
    (0, swagger_1.ApiParam)({ name: "id", required: true }),
    (0, common_1.UseInterceptors)((0, platform_express_1.FileFieldsInterceptor)([
        { name: "images", maxCount: 5 },
        { name: "video", maxCount: 1 },
    ])),
    (0, swagger_1.ApiBody)({ type: update_product_dto_1.UpdateProductDto }),
    __param(0, (0, common_1.Param)("id")),
    __param(1, (0, common_1.Body)()),
    __param(2, (0, common_1.UploadedFiles)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, update_product_dto_1.UpdateProductDto, Object]),
    __metadata("design:returntype", Promise)
], ProductsController.prototype, "update", null);
__decorate([
    (0, common_1.Delete)(":id"),
    (0, swagger_1.ApiOperation)({ summary: "Delete product by ID" }),
    (0, swagger_1.ApiParam)({ name: "id", required: true }),
    __param(0, (0, common_1.Param)("id")),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", Promise)
], ProductsController.prototype, "delete", null);
exports.ProductsController = ProductsController = __decorate([
    (0, swagger_1.ApiTags)("Products"),
    (0, swagger_1.ApiBearerAuth)("jwt"),
    (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard),
    (0, common_1.Controller)("products"),
    __metadata("design:paramtypes", [products_service_1.ProductsService])
], ProductsController);
//# sourceMappingURL=products.controller.js.map