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
exports.ShopService = void 0;
const common_1 = require("@nestjs/common");
const mongoose_1 = require("@nestjs/mongoose");
const mongoose_2 = require("mongoose");
const shop_schema_1 = require("./schema/shop.schema");
const products_service_1 = require("../products/products.service");
const services_service_1 = require("../services/services.service");
let ShopService = class ShopService {
    shopModel;
    productsService;
    servicesService;
    constructor(shopModel, productsService, servicesService) {
        this.shopModel = shopModel;
        this.productsService = productsService;
        this.servicesService = servicesService;
    }
    async createShop(ownerId, dto) {
        const shop = new this.shopModel({
            ...dto,
            ownerId,
        });
        return shop.save();
    }
    async updateShop(shopId, dto) {
        const { ownerId, ...safeDto } = dto;
        const updated = await this.shopModel.findByIdAndUpdate(shopId, { ...safeDto }, { new: true });
        if (dto.location) {
            this.productsService.updateLocationByShopId(shopId, dto.location);
        }
        if (!updated) {
            throw new common_1.NotFoundException('Shop not found');
        }
        return updated;
    }
    async getShopById(shopId) {
        const shop = await this.shopModel.findById(shopId);
        if (!shop) {
            throw new common_1.NotFoundException('Shop not found');
        }
        return shop;
    }
    async getAllShopsByUser(userId) {
        return this.shopModel.find({ ownerId: new mongoose_2.Types.ObjectId(userId) }).exec();
    }
    async findShopsNearLocation(location, radiusInMeters) {
        return this.shopModel.find({
            location: {
                $near: {
                    $geometry: {
                        type: 'Point',
                        coordinates: location,
                    },
                    $maxDistance: radiusInMeters,
                },
            },
        });
    }
};
exports.ShopService = ShopService;
exports.ShopService = ShopService = __decorate([
    (0, common_1.Injectable)(),
    __param(0, (0, mongoose_1.InjectModel)(shop_schema_1.Shop.name)),
    __param(1, (0, common_1.Inject)((0, common_1.forwardRef)(() => products_service_1.ProductsService))),
    __param(2, (0, common_1.Inject)((0, common_1.forwardRef)(() => services_service_1.ServicesService))),
    __metadata("design:paramtypes", [mongoose_2.Model,
        products_service_1.ProductsService,
        services_service_1.ServicesService])
], ShopService);
//# sourceMappingURL=shop.service.js.map