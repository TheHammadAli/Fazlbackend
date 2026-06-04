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
const nestjs_i18n_1 = require("nestjs-i18n");
const shop_schema_1 = require("./schema/shop.schema");
const products_service_1 = require("../products/products.service");
const users_service_1 = require("../users/users.service");
const file_upload_service_1 = require("../common/file-upload/file-upload.service");
const nestjs_cls_1 = require("nestjs-cls");
const orders_service_1 = require("../orders/orders.service");
let ShopService = class ShopService {
    shopModel;
    productsService;
    usersService;
    fileUploadService;
    ordersService;
    i18n;
    cls;
    constructor(shopModel, productsService, usersService, fileUploadService, ordersService, i18n, cls) {
        this.shopModel = shopModel;
        this.productsService = productsService;
        this.usersService = usersService;
        this.fileUploadService = fileUploadService;
        this.ordersService = ordersService;
        this.i18n = i18n;
        this.cls = cls;
    }
    get lang() {
        return this.cls?.get("lang") ?? "en";
    }
    async createShop(ownerId, dto) {
        const existingUser = await this.usersService.findUserById(ownerId.toString());
        if (!existingUser) {
            throw new common_1.NotFoundException(this.i18n.translate("auth.shop.user_not_found", { lang: this.lang }));
        }
        let image = {};
        if (dto.image) {
            image = dto.image;
            dto.image = "default-shop.png";
        }
        const shop = new this.shopModel({
            ...dto,
            ownerId,
        });
        const results = await shop.save();
        if (dto.image) {
            const imageUrl = await this.fileUploadService.uploadShopImage(results._id, image);
            results.image = imageUrl;
        }
        const shopResult = await results.save();
        return {
            message: this.i18n.translate("auth.shop.created_success", {
                lang: this.lang,
            }),
            data: shopResult,
        };
    }
    async updateShop(shopId, dto) {
        const { ...safeDto } = dto;
        const existingShop = await this.shopModel.findById(shopId);
        if (!existingShop) {
            throw new common_1.NotFoundException(this.i18n.translate("auth.shop.shop_not_found", { lang: this.lang }));
        }
        if (dto.image) {
            const imageUrl = await this.fileUploadService.uploadShopImage(shopId, dto.image);
            safeDto.image = imageUrl;
        }
        const updated = await this.shopModel.findByIdAndUpdate(shopId, {
            ...safeDto,
        });
        if (dto.location) {
            this.productsService.updateLocationByShopId(shopId, dto.location);
        }
        if (!updated) {
            throw new common_1.NotFoundException(this.i18n.translate("auth.shop.shop_not_found", { lang: this.lang }));
        }
        return { message: this.i18n.translate("auth.shop.updated_success", { lang: this.lang }), data: updated.toJSON() };
    }
    async getShopById(shopId) {
        const shop = await this.shopModel
            .findById(shopId)
            .populate("ownerId", "name email");
        if (!shop) {
            throw new common_1.NotFoundException(this.i18n.translate("auth.shop.shop_not_found", { lang: this.lang }));
        }
        const productsCount = await this.productsService.getAllProductsByShop(shopId, { page: 1, limit: 1 });
        const ordersCount = await this.ordersService.getOrdersByOwner(shopId, "Shop", 1, 1);
        return { ...shop.toJSON(), productsCount: productsCount.meta.total, ordersCount: ordersCount.meta.total };
    }
    async getAllShopsByUser(userId) {
        return this.shopModel.find({ ownerId: new mongoose_2.Types.ObjectId(userId) }).exec();
    }
    async setShopDisabled(shopId, disabled) {
        await this.shopModel.findByIdAndUpdate(shopId, { $set: { isDisabled: disabled } });
    }
    async setShopsDisabledBulk(shopIds, disabled) {
        await this.shopModel.updateMany({ _id: { $in: shopIds } }, { $set: { isDisabled: disabled } });
    }
    async findShopsNearLocation(location, radiusInMeters) {
        return this.shopModel.find({
            location: {
                $near: {
                    $geometry: {
                        type: "Point",
                        coordinates: location,
                    },
                    $maxDistance: radiusInMeters,
                },
            },
            isDisabled: false,
        });
    }
    async findShopsNearLocationPaginated(location, radiusInMeters, pagination) {
        const { page = 1, limit = 10 } = pagination || {};
        const skip = (page - 1) * limit;
        const query = { isDeleted: false };
        const [data, countAgg] = await Promise.all([
            this.shopModel.aggregate([
                {
                    $geoNear: {
                        near: { type: "Point", coordinates: location },
                        distanceField: "distance",
                        maxDistance: radiusInMeters,
                        query,
                        spherical: true,
                    },
                },
                { $sort: { createdAt: -1 } },
                { $skip: skip },
                { $limit: limit },
            ]),
            this.shopModel.aggregate([
                {
                    $geoNear: {
                        near: { type: "Point", coordinates: location },
                        distanceField: "distance",
                        maxDistance: radiusInMeters,
                        query,
                        spherical: true,
                    },
                },
                { $count: "total" },
            ]),
        ]);
        const total = countAgg[0]?.total || 0;
        return {
            meta: { total, page, limit, totalPages: Math.ceil(total / limit) },
            data,
        };
    }
};
exports.ShopService = ShopService;
exports.ShopService = ShopService = __decorate([
    (0, common_1.Injectable)(),
    __param(0, (0, mongoose_1.InjectModel)(shop_schema_1.Shop.name)),
    __param(1, (0, common_1.Inject)((0, common_1.forwardRef)(() => products_service_1.ProductsService))),
    __param(2, (0, common_1.Inject)((0, common_1.forwardRef)(() => users_service_1.UsersService))),
    __param(4, (0, common_1.Inject)((0, common_1.forwardRef)(() => orders_service_1.OrdersService))),
    __metadata("design:paramtypes", [mongoose_2.Model,
        products_service_1.ProductsService,
        users_service_1.UsersService,
        file_upload_service_1.FileUploadService,
        orders_service_1.OrdersService,
        nestjs_i18n_1.I18nService,
        nestjs_cls_1.ClsService])
], ShopService);
//# sourceMappingURL=shop.service.js.map