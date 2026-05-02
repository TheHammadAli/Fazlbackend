"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.ChatModule = void 0;
const common_1 = require("@nestjs/common");
const chat_service_1 = require("./chat.service");
const chat_controller_1 = require("./chat.controller");
const mongoose_1 = require("@nestjs/mongoose");
const message_schema_1 = require("./schema/message.schema");
const conversation_schema_1 = require("./schema/conversation.schema");
const chat_gateway_1 = require("./chat.gateway");
const users_module_1 = require("../users/users.module");
const shop_module_1 = require("../shop/shop.module");
const file_upload_service_1 = require("../common/file-upload/file-upload.service");
const config_1 = require("@nestjs/config");
const notifications_module_1 = require("../notifications/notifications.module");
let ChatModule = class ChatModule {
};
exports.ChatModule = ChatModule;
exports.ChatModule = ChatModule = __decorate([
    (0, common_1.Module)({
        imports: [
            mongoose_1.MongooseModule.forFeature([
                { name: message_schema_1.Message.name, schema: message_schema_1.MessageSchema },
                { name: conversation_schema_1.Conversation.name, schema: conversation_schema_1.ConversationSchema },
            ]),
            users_module_1.UsersModule,
            shop_module_1.ShopModule,
            notifications_module_1.NotificationsModule,
        ],
        providers: [chat_service_1.ChatService, chat_gateway_1.ChatGateway, file_upload_service_1.FileUploadService, config_1.ConfigService],
        controllers: [chat_controller_1.ChatController],
    })
], ChatModule);
//# sourceMappingURL=chat.module.js.map