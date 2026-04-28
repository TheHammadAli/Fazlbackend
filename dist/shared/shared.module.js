"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.SharedModule = void 0;
const common_1 = require("@nestjs/common");
const listing_util_service_1 = require("./listing-util-service");
const products_module_1 = require("../products/products.module");
const services_module_1 = require("../services/services.module");
const file_upload_service_1 = require("../common/file-upload/file-upload.service");
const config_1 = require("@nestjs/config");
const like_service_1 = require("./like.service");
const like_controller_1 = require("./like.controller");
const mongoose_1 = require("@nestjs/mongoose");
const like_schema_1 = require("./schema/like.schema");
let SharedModule = class SharedModule {
};
exports.SharedModule = SharedModule;
exports.SharedModule = SharedModule = __decorate([
    (0, common_1.Module)({
        imports: [
            config_1.ConfigModule,
            (0, common_1.forwardRef)(() => products_module_1.ProductsModule),
            (0, common_1.forwardRef)(() => services_module_1.ServicesModule),
            mongoose_1.MongooseModule.forFeature([{ name: like_schema_1.Like.name, schema: like_schema_1.LikeSchema }]),
        ],
        providers: [listing_util_service_1.ListingUtilsService, file_upload_service_1.FileUploadService, like_service_1.LikeService],
        controllers: [like_controller_1.LikeController],
        exports: [listing_util_service_1.ListingUtilsService, file_upload_service_1.FileUploadService, like_service_1.LikeService],
    })
], SharedModule);
//# sourceMappingURL=shared.module.js.map