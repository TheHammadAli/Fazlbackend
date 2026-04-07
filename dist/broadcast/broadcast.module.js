"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.BroadcastModule = void 0;
const common_1 = require("@nestjs/common");
const mongoose_1 = require("@nestjs/mongoose");
const broadcast_controller_1 = require("./broadcast.controller");
const broadcast_service_1 = require("./broadcast.service");
const shop_module_1 = require("../shop/shop.module");
const category_module_1 = require("../category/category.module");
const broadcast_schema_1 = require("./schema/broadcast.schema");
const broadcast_message_schema_1 = require("./schema/broadcast-message.schema");
const users_module_1 = require("../users/users.module");
const broadcast_thread_schema_1 = require("./schema/broadcast-thread.schema");
let BroadcastModule = class BroadcastModule {
};
exports.BroadcastModule = BroadcastModule;
exports.BroadcastModule = BroadcastModule = __decorate([
    (0, common_1.Module)({
        imports: [
            mongoose_1.MongooseModule.forFeature([
                {
                    name: broadcast_schema_1.Broadcast.name,
                    schema: broadcast_schema_1.BroadcastSchema,
                },
                {
                    name: broadcast_message_schema_1.BroadcastMessage.name,
                    schema: broadcast_message_schema_1.BroadcastMessageSchema,
                },
                { name: broadcast_thread_schema_1.BroadcastThread.name, schema: broadcast_thread_schema_1.BroadcastThreadSchema },
            ]),
            shop_module_1.ShopModule,
            category_module_1.CategoryModule,
            users_module_1.UsersModule
        ],
        controllers: [broadcast_controller_1.BroadcastController],
        providers: [broadcast_service_1.BroadcastService],
        exports: [broadcast_service_1.BroadcastService],
    })
], BroadcastModule);
//# sourceMappingURL=broadcast.module.js.map