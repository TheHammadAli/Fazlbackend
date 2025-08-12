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
const file_upload_service_1 = require("../common/file-upload/file-upload.service");
const swagger_1 = require("@nestjs/swagger");
let ProductsController = class ProductsController {
    productsService;
    fileUploadService;
    constructor(productsService, fileUploadService) {
        this.productsService = productsService;
        this.fileUploadService = fileUploadService;
    }
    async createProduct(entityId, type, createProductDto, files) {
        console.log;
        createProductDto.parameters = JSON.parse(createProductDto.parameters?.toString() || '{}');
        console.log('Creating product with entityId:', entityId, 'and type:', type);
        console.log('Product DTO:', createProductDto);
        return this.productsService.create(entityId, type, createProductDto, files);
    }
    async getAllByShop(shopId, paginationDto) {
        return this.productsService.getAllProductsByShop(shopId, paginationDto);
    }
    async getAllProductsByUser(userId, paginationDto) {
        return this.productsService.getAllProductsByUser(userId, paginationDto);
    }
    async getById(id) {
        return this.productsService.getById(id);
    }
    async update(id, updateProductDto) {
        return this.productsService.update(id, updateProductDto);
    }
    async delete(id) {
        await this.productsService.delete(id);
        return { message: 'Product deleted successfully' };
    }
};
exports.ProductsController = ProductsController;
__decorate([
    (0, common_1.Post)(':entityId/:type'),
    (0, common_1.UseInterceptors)((0, platform_express_1.FileFieldsInterceptor)([{ name: 'images', maxCount: 5 }])),
    (0, swagger_1.ApiOperation)({ summary: 'Create a new product (shop or personal listing)' }),
    (0, swagger_1.ApiConsumes)('multipart/form-data'),
    (0, swagger_1.ApiParam)({
        name: 'entityId',
        required: true,
        description: 'Shop ID or User ID depending on type',
    }),
    (0, swagger_1.ApiParam)({
        name: 'type',
        required: true,
        description: `'shop' for business listings, 'personal' for user-created listings`,
        enum: ['shop', 'personal'],
    }),
    (0, swagger_1.ApiBody)({
        description: 'Product data with optional image upload',
        type: create_product_dto_1.CreateProductDto,
    }),
    __param(0, (0, common_1.Param)('entityId')),
    __param(1, (0, common_1.Param)('type')),
    __param(2, (0, common_1.Body)()),
    __param(3, (0, common_1.UploadedFiles)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String, create_product_dto_1.CreateProductDto, Object]),
    __metadata("design:returntype", Promise)
], ProductsController.prototype, "createProduct", null);
__decorate([
    (0, common_1.Get)(':shopId'),
    (0, swagger_1.ApiOperation)({ summary: 'Get all products for a shop' }),
    (0, swagger_1.ApiParam)({ name: 'shopId', required: true }),
    (0, swagger_1.ApiQuery)({ name: 'page', required: false }),
    (0, swagger_1.ApiQuery)({ name: 'limit', required: false }),
    __param(0, (0, common_1.Param)('shopId')),
    __param(1, (0, common_1.Query)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, pagination_dto_1.PaginationDto]),
    __metadata("design:returntype", Promise)
], ProductsController.prototype, "getAllByShop", null);
__decorate([
    (0, common_1.Get)('user/:userId'),
    (0, swagger_1.ApiOperation)({ summary: 'Get all products for a User' }),
    (0, swagger_1.ApiParam)({ name: 'userId', required: true }),
    (0, swagger_1.ApiQuery)({ name: 'page', required: false }),
    (0, swagger_1.ApiQuery)({ name: 'limit', required: false }),
    __param(0, (0, common_1.Param)('userId')),
    __param(1, (0, common_1.Query)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, pagination_dto_1.PaginationDto]),
    __metadata("design:returntype", Promise)
], ProductsController.prototype, "getAllProductsByUser", null);
__decorate([
    (0, common_1.Get)('detail/:id'),
    (0, swagger_1.ApiOperation)({ summary: 'Get product details by ID' }),
    (0, swagger_1.ApiParam)({ name: 'id', required: true }),
    __param(0, (0, common_1.Param)('id')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", Promise)
], ProductsController.prototype, "getById", null);
__decorate([
    (0, common_1.Put)(':id'),
    (0, swagger_1.ApiOperation)({ summary: 'Update product by ID' }),
    (0, swagger_1.ApiParam)({ name: 'id', required: true }),
    (0, swagger_1.ApiBody)({ type: update_product_dto_1.UpdateProductDto }),
    __param(0, (0, common_1.Param)('id')),
    __param(1, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, update_product_dto_1.UpdateProductDto]),
    __metadata("design:returntype", Promise)
], ProductsController.prototype, "update", null);
__decorate([
    (0, common_1.Delete)(':id'),
    (0, swagger_1.ApiOperation)({ summary: 'Delete product by ID' }),
    (0, swagger_1.ApiParam)({ name: 'id', required: true }),
    __param(0, (0, common_1.Param)('id')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", Promise)
], ProductsController.prototype, "delete", null);
exports.ProductsController = ProductsController = __decorate([
    (0, swagger_1.ApiTags)('Products'),
    (0, swagger_1.ApiBearerAuth)('jwt'),
    (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard),
    (0, common_1.Controller)('products'),
    __metadata("design:paramtypes", [products_service_1.ProductsService,
        file_upload_service_1.FileUploadService])
], ProductsController);
//# sourceMappingURL=products.controller.js.map