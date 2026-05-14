"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.ShopModule = void 0;
const common_1 = require("@nestjs/common");
const shop_service_1 = require("./shop.service");
const shop_controller_1 = require("./shop.controller");
const mongoose_1 = require("@nestjs/mongoose");
const shop_schema_1 = require("./schema/shop.schema");
const shared_module_1 = require("../shared/shared.module");
const products_module_1 = require("../products/products.module");
const services_module_1 = require("../services/services.module");
const users_module_1 = require("../users/users.module");
const orders_module_1 = require("../orders/orders.module");
let ShopModule = class ShopModule {
};
exports.ShopModule = ShopModule;
exports.ShopModule = ShopModule = __decorate([
    (0, common_1.Module)({
        imports: [
            mongoose_1.MongooseModule.forFeature([{ name: shop_schema_1.Shop.name, schema: shop_schema_1.ShopSchema }]),
            (0, common_1.forwardRef)(() => shared_module_1.SharedModule),
            (0, common_1.forwardRef)(() => products_module_1.ProductsModule),
            (0, common_1.forwardRef)(() => users_module_1.UsersModule),
            (0, common_1.forwardRef)(() => services_module_1.ServicesModule),
            (0, common_1.forwardRef)(() => orders_module_1.OrdersModule),
        ],
        providers: [shop_service_1.ShopService],
        controllers: [shop_controller_1.ShopController],
        exports: [shop_service_1.ShopService],
    })
], ShopModule);
//# sourceMappingURL=shop.module.js.map