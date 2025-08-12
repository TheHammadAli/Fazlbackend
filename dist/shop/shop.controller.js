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
const jwt_auth_guard_1 = require("../auth/guard/jwt-auth-guard");
const mongoose_1 = require("mongoose");
const current_user_decorator_1 = require("../common/decorators/current-user.decorator");
const swagger_1 = require("@nestjs/swagger");
let ShopController = class ShopController {
    shopService;
    constructor(shopService) {
        this.shopService = shopService;
    }
    async createShop(dto, req) {
        const user = req.user;
        return this.shopService.createShop(new mongoose_1.Types.ObjectId(user.sub), dto);
    }
    async updateShop(id, dto) {
        return this.shopService.updateShop(id, dto);
    }
    async getShop(id) {
        return this.shopService.getShopById(id);
    }
    async getMyShops(user) {
        return this.shopService.getAllShopsByUser(user.sub);
    }
};
exports.ShopController = ShopController;
__decorate([
    (0, common_1.Post)('create'),
    (0, swagger_1.ApiOperation)({ summary: 'Create a new shop' }),
    (0, swagger_1.ApiBody)({ type: create_update_shop_dto_1.CreateUpdateShopDto }),
    __param(0, (0, common_1.Body)()),
    __param(1, (0, common_1.Req)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [create_update_shop_dto_1.CreateUpdateShopDto, Object]),
    __metadata("design:returntype", Promise)
], ShopController.prototype, "createShop", null);
__decorate([
    (0, common_1.Put)(':id'),
    (0, swagger_1.ApiOperation)({ summary: 'Update existing shop by ID' }),
    (0, swagger_1.ApiParam)({ name: 'id', type: String }),
    (0, swagger_1.ApiBody)({ type: create_update_shop_dto_1.CreateUpdateShopDto }),
    __param(0, (0, common_1.Param)('id')),
    __param(1, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, create_update_shop_dto_1.CreateUpdateShopDto]),
    __metadata("design:returntype", Promise)
], ShopController.prototype, "updateShop", null);
__decorate([
    (0, common_1.Get)('detail/:id'),
    (0, swagger_1.ApiOperation)({ summary: 'Get shop details by ID' }),
    (0, swagger_1.ApiParam)({ name: 'id', type: String }),
    __param(0, (0, common_1.Param)('id')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", Promise)
], ShopController.prototype, "getShop", null);
__decorate([
    (0, common_1.Get)('userShops'),
    (0, swagger_1.ApiOperation)({ summary: 'Get all shops owned by current user' }),
    __param(0, (0, current_user_decorator_1.CurrentUser)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", Promise)
], ShopController.prototype, "getMyShops", null);
exports.ShopController = ShopController = __decorate([
    (0, swagger_1.ApiTags)('Shops'),
    (0, swagger_1.ApiBearerAuth)('jwt'),
    (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard),
    (0, common_1.Controller)('shops'),
    __metadata("design:paramtypes", [shop_service_1.ShopService])
], ShopController);
//# sourceMappingURL=shop.controller.js.map