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
exports.ShopController = void 0;
const common_1 = require("@nestjs/common");
const shop_service_1 = require("./shop.service");
const create_update_shop_dto_1 = require("./dto/create-update-shop.dto");
const search_nearby_shop_dto_1 = require("./dto/search-nearby-shop.dto");
const jwt_auth_guard_1 = require("../auth/guard/jwt-auth-guard");
const mongoose_1 = require("mongoose");
const current_user_decorator_1 = require("../common/decorators/current-user.decorator");
const swagger_1 = require("@nestjs/swagger");
const platform_express_1 = require("@nestjs/platform-express");
const public_decorator_1 = require("../common/decorators/public.decorator");
let ShopController = class ShopController {
    shopService;
    constructor(shopService) {
        this.shopService = shopService;
    }
    async createShop(dto, req, files) {
        const user = req.user;
        if (files?.image && files.image.length > 0) {
            dto.image = files.image[0];
        }
        if (dto.location) {
            dto.location = JSON.parse(dto.location?.toString() || "{}");
        }
        return this.shopService.createShop(new mongoose_1.Types.ObjectId(user.sub), dto);
    }
    async updateShop(id, dto, files) {
        if (files?.image && files.image.length > 0) {
            dto.image = files.image[0];
        }
        if (dto.location) {
            dto.location = JSON.parse(dto.location?.toString() || "{}");
        }
        return this.shopService.updateShop(id, dto);
    }
    async getShop(id) {
        return this.shopService.getShopById(id);
    }
    async getMyShops(user) {
        return this.shopService.getAllShopsByUser(user.sub);
    }
    async searchNearbyShops(query) {
        const coordinates = [query.lng, query.lat];
        const radiusMeters = query.radius * 1000;
        return await this.shopService.findShopsNearLocationPaginated(coordinates, radiusMeters, { page: query.page, limit: query.limit });
    }
};
exports.ShopController = ShopController;
__decorate([
    (0, common_1.Post)("create"),
    (0, swagger_1.ApiOperation)({ summary: "Create a new shop" }),
    (0, swagger_1.ApiConsumes)("multipart/form-data"),
    (0, common_1.UseInterceptors)((0, platform_express_1.FileFieldsInterceptor)([{ name: "image", maxCount: 1 }])),
    (0, swagger_1.ApiBody)({ type: create_update_shop_dto_1.CreateUpdateShopDto }),
    __param(0, (0, common_1.Body)()),
    __param(1, (0, common_1.Req)()),
    __param(2, (0, common_1.UploadedFiles)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [create_update_shop_dto_1.CreateUpdateShopDto, Object, Object]),
    __metadata("design:returntype", Promise)
], ShopController.prototype, "createShop", null);
__decorate([
    (0, common_1.Put)(":id"),
    (0, swagger_1.ApiOperation)({ summary: "Update existing shop by ID" }),
    (0, swagger_1.ApiParam)({ name: "id", type: String }),
    (0, swagger_1.ApiConsumes)("multipart/form-data"),
    (0, common_1.UseInterceptors)((0, platform_express_1.FileFieldsInterceptor)([{ name: "image", maxCount: 1 }])),
    (0, swagger_1.ApiBody)({ type: create_update_shop_dto_1.CreateUpdateShopDto }),
    __param(0, (0, common_1.Param)("id")),
    __param(1, (0, common_1.Body)()),
    __param(2, (0, common_1.UploadedFiles)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, create_update_shop_dto_1.CreateUpdateShopDto, Object]),
    __metadata("design:returntype", Promise)
], ShopController.prototype, "updateShop", null);
__decorate([
    (0, public_decorator_1.Public)(),
    (0, common_1.Get)("detail/:id"),
    (0, swagger_1.ApiOperation)({ summary: "Get shop details by ID" }),
    (0, swagger_1.ApiParam)({ name: "id", type: String }),
    __param(0, (0, common_1.Param)("id")),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", Promise)
], ShopController.prototype, "getShop", null);
__decorate([
    (0, common_1.Get)("userShops"),
    (0, swagger_1.ApiOperation)({ summary: "Get all shops owned by current user" }),
    __param(0, (0, current_user_decorator_1.CurrentUser)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", Promise)
], ShopController.prototype, "getMyShops", null);
__decorate([
    (0, public_decorator_1.Public)(),
    (0, common_1.Get)("search/nearby"),
    (0, swagger_1.ApiOperation)({ summary: "Search shops near a coordinate within a radius" }),
    (0, swagger_1.ApiQuery)({ name: "lat", required: true, type: Number }),
    (0, swagger_1.ApiQuery)({ name: "lng", required: true, type: Number }),
    (0, swagger_1.ApiQuery)({ name: "radius", required: true, type: Number, description: "Distance in kilometers" }),
    (0, swagger_1.ApiQuery)({ name: "page", required: false, type: Number }),
    (0, swagger_1.ApiQuery)({ name: "limit", required: false, type: Number }),
    (0, swagger_1.ApiResponse)({ status: 200, description: "Paginated list of nearby shops" }),
    __param(0, (0, common_1.Query)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [search_nearby_shop_dto_1.SearchNearbyShopDto]),
    __metadata("design:returntype", Promise)
], ShopController.prototype, "searchNearbyShops", null);
exports.ShopController = ShopController = __decorate([
    (0, swagger_1.ApiTags)("Shops"),
    (0, swagger_1.ApiBearerAuth)("jwt"),
    (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard),
    (0, common_1.Controller)("shops"),
    __metadata("design:paramtypes", [shop_service_1.ShopService])
], ShopController);
//# sourceMappingURL=shop.controller.js.map