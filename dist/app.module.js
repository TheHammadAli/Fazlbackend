"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.AppModule = void 0;
const common_1 = require("@nestjs/common");
const app_controller_1 = require("./app.controller");
const app_service_1 = require("./app.service");
const auth_module_1 = require("./auth/auth.module");
const users_module_1 = require("./users/users.module");
const products_module_1 = require("./products/products.module");
const search_module_1 = require("./search/search.module");
const config_1 = require("@nestjs/config");
const mongoose_1 = require("@nestjs/mongoose");
const shop_module_1 = require("./shop/shop.module");
const category_module_1 = require("./category/category.module");
const services_module_1 = require("./services/services.module");
const chat_module_1 = require("./chat/chat.module");
const reviews_module_1 = require("./reviews/reviews.module");
const throttler_1 = require("@nestjs/throttler");
const core_1 = require("@nestjs/core");
const nestjs_i18n_1 = require("nestjs-i18n");
const orders_module_1 = require("./orders/orders.module");
const subscription_module_1 = require("./subscription/subscription.module");
const promotion_module_1 = require("./promotion/promotion.module");
const notifications_module_1 = require("./notifications/notifications.module");
const broadcast_module_1 = require("./broadcast/broadcast.module");
const cls_module_1 = require("./core/cls/cls.module");
const path = __importStar(require("path"));
const language_interceptor_1 = require("./common/interceptors/language.interceptor");
const like_module_1 = require("./like/like.module");
const isProduction = process.env.NODE_ENV === "production";
let AppModule = class AppModule {
};
exports.AppModule = AppModule;
exports.AppModule = AppModule = __decorate([
    (0, common_1.Module)({
        imports: [
            config_1.ConfigModule.forRoot(),
            throttler_1.ThrottlerModule.forRoot({
                throttlers: [
                    {
                        ttl: 60,
                        limit: 100,
                    },
                ],
            }),
            nestjs_i18n_1.I18nModule.forRoot({
                fallbackLanguage: "en",
                loaderOptions: {
                    path: path.join(process.cwd(), "src/i18n/"),
                    watch: !isProduction,
                },
                resolvers: [
                    { use: nestjs_i18n_1.QueryResolver, options: ["lang", "locale", "l"] },
                    nestjs_i18n_1.AcceptLanguageResolver,
                ],
            }),
            mongoose_1.MongooseModule.forRootAsync({
                imports: [config_1.ConfigModule],
                useFactory: async (configService) => ({
                    uri: configService.get("MONGODB_URI"),
                }),
                inject: [config_1.ConfigService],
            }),
            auth_module_1.AuthModule,
            users_module_1.UsersModule,
            cls_module_1.ClsConfigModule,
            products_module_1.ProductsModule,
            services_module_1.ServicesModule,
            search_module_1.SearchModule,
            shop_module_1.ShopModule,
            category_module_1.CategoryModule,
            chat_module_1.ChatModule,
            reviews_module_1.ReviewsModule,
            orders_module_1.OrdersModule,
            subscription_module_1.SubscriptionModule,
            promotion_module_1.PromotionModule,
            notifications_module_1.NotificationsModule,
            broadcast_module_1.BroadcastModule,
            like_module_1.LikeModule,
        ],
        controllers: [app_controller_1.AppController],
        providers: [
            app_service_1.AppService,
            language_interceptor_1.LanguageInterceptor,
            {
                provide: core_1.APP_GUARD,
                useClass: throttler_1.ThrottlerGuard,
            },
        ],
    })
], AppModule);
//# sourceMappingURL=app.module.js.map