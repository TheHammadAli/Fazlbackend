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
exports.ChatController = void 0;
const common_1 = require("@nestjs/common");
const chat_service_1 = require("./chat.service");
const pagination_dto_1 = require("../common/dto/pagination.dto");
const swagger_1 = require("@nestjs/swagger");
const create_message_dto_1 = require("./dto/create-message.dto");
const platform_express_1 = require("@nestjs/platform-express");
const file_upload_service_1 = require("../common/file-upload/file-upload.service");
const permissions_guard_1 = require("../auth/guard/permissions-guard");
const jwt_auth_guard_1 = require("../auth/guard/jwt-auth-guard");
const require_permission_decorator_1 = require("../common/decorators/require-permission.decorator");
let ChatController = class ChatController {
    chatService;
    fileUploadService;
    constructor(chatService, fileUploadService) {
        this.chatService = chatService;
        this.fileUploadService = fileUploadService;
    }
    async getOrCreateConversation(body) {
        return this.chatService.getOrCreateConversation(body.buyerId, body.sellerId);
    }
    async sendMessage(body, file) {
        console.log("File received in controller:", file);
        let imageUrl;
        if (file && file.size > 0) {
            imageUrl = await this.fileUploadService.uploadChatMessage(body.conversationId, file);
        }
        return this.chatService.sendMessage(body.conversationId, body.senderId, body.receiverId, body.text, imageUrl);
    }
    async getMessages(conversationId, paginationDto) {
        return this.chatService.getMessages(conversationId, paginationDto);
    }
    async markConversationAsRead(conversationId, req) {
        const user = req.user;
        return this.chatService.markAsRead(conversationId, user.sub);
    }
    async markAsRead(body) {
        return this.chatService.markAsRead(body.conversationId, body.userId);
    }
    async getUnreadCount(userId) {
        return this.chatService.getUnreadConversations(userId);
    }
    async getConversationsByUserId(userId, paginationDto) {
        return this.chatService.getConversationsByUserId(userId, paginationDto);
    }
    async getAdminConversation(customerId, providerId, paginationDto) {
        const conversation = await this.chatService.findConversationBetween(customerId, providerId);
        if (!conversation) {
            const { page = 1, limit = 10 } = paginationDto;
            return {
                conversation: null,
                messages: [],
                meta: { total: 0, page, limit, totalPages: 0 },
            };
        }
        const { data: messages, meta } = await this.chatService.getMessages(String(conversation._id), paginationDto);
        return {
            conversation: { _id: conversation._id, status: conversation.status },
            messages,
            meta,
        };
    }
    async getAdminUserConversations(userId, paginationDto) {
        return this.chatService.getConversationsByUserId(userId, paginationDto);
    }
    async getAdminConversationMessages(conversationId, paginationDto) {
        return this.chatService.getMessages(conversationId, paginationDto);
    }
};
exports.ChatController = ChatController;
__decorate([
    (0, common_1.Post)("conversation"),
    (0, swagger_1.ApiOperation)({
        summary: "Get or create a conversation between buyer and seller",
    }),
    (0, swagger_1.ApiBody)({
        schema: {
            type: "object",
            properties: {
                buyerId: { type: "string", example: "6645f1d8a8c02c2b8f5a9df0" },
                sellerId: { type: "string", example: "6645f1d8a8c02c2b8f5a9df1" },
            },
        },
    }),
    __param(0, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", Promise)
], ChatController.prototype, "getOrCreateConversation", null);
__decorate([
    (0, common_1.Post)("message"),
    (0, swagger_1.ApiOperation)({ summary: "Send a message in a conversation" }),
    (0, swagger_1.ApiConsumes)("application/json", "multipart/form-data"),
    (0, swagger_1.ApiBody)({
        schema: {
            type: "object",
            properties: {
                conversationId: { type: "string" },
                senderId: { type: "string" },
                receiverId: { type: "string" },
                text: { type: "string" },
                file: {
                    type: "string",
                    format: "binary",
                    nullable: true,
                },
            },
        },
    }),
    (0, common_1.UseInterceptors)((0, platform_express_1.FileInterceptor)("file")),
    __param(0, (0, common_1.Body)()),
    __param(1, (0, common_1.UploadedFile)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [create_message_dto_1.CreateMessageDto, Object]),
    __metadata("design:returntype", Promise)
], ChatController.prototype, "sendMessage", null);
__decorate([
    (0, common_1.Get)("messages/:conversationId"),
    (0, swagger_1.ApiOperation)({ summary: "Get paginated messages for a conversation" }),
    __param(0, (0, common_1.Param)("conversationId")),
    __param(1, (0, common_1.Query)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, pagination_dto_1.PaginationDto]),
    __metadata("design:returntype", Promise)
], ChatController.prototype, "getMessages", null);
__decorate([
    (0, common_1.Patch)("conversations/:conversationId/read"),
    (0, swagger_1.ApiOperation)({
        summary: "Mark all unread messages in a conversation as read",
    }),
    __param(0, (0, common_1.Param)("conversationId")),
    __param(1, (0, common_1.Req)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Object]),
    __metadata("design:returntype", Promise)
], ChatController.prototype, "markConversationAsRead", null);
__decorate([
    (0, common_1.Patch)("messages/mark-read"),
    (0, swagger_1.ApiOperation)({
        summary: "Mark all messages as read for a user in a conversation",
    }),
    (0, swagger_1.ApiBody)({
        schema: {
            type: "object",
            properties: {
                conversationId: { type: "string", example: "665f6d9a3ef12a0c4c122d23" },
                userId: { type: "string", example: "6645f1d8a8c02c2b8f5a9df2" },
            },
        },
    }),
    __param(0, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", Promise)
], ChatController.prototype, "markAsRead", null);
__decorate([
    (0, common_1.Get)("messages/unread/:userId"),
    (0, swagger_1.ApiOperation)({ summary: "Get count of unread conversations for a user" }),
    __param(0, (0, common_1.Param)("userId")),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", Promise)
], ChatController.prototype, "getUnreadCount", null);
__decorate([
    (0, common_1.Get)("conversations/:userId"),
    (0, swagger_1.ApiOperation)({
        summary: "Get all conversations for a user with pagination",
    }),
    (0, swagger_1.ApiResponse)({
        status: 200,
        description: "Paginated list of conversations for the user",
        schema: {
            type: "object",
            properties: {
                meta: {
                    type: "object",
                    properties: {
                        total: { type: "number", example: 10 },
                        page: { type: "number", example: 1 },
                        limit: { type: "number", example: 10 },
                        totalPages: { type: "number", example: 1 },
                    },
                },
                data: {
                    type: "array",
                    items: {
                        type: "object",
                        properties: {
                            _id: { type: "string" },
                            buyer: {
                                type: "object",
                                properties: {
                                    _id: { type: "string" },
                                    name: { type: "string" },
                                    email: { type: "string" },
                                    profilePicture: { type: "string" },
                                },
                            },
                            seller: {
                                type: "object",
                                properties: {
                                    _id: { type: "string" },
                                    name: { type: "string" },
                                    email: { type: "string" },
                                    profilePicture: { type: "string" },
                                },
                            },
                            status: { type: "string", enum: ["open", "closed"] },
                            lastMessageAt: { type: "string", format: "date-time" },
                            createdAt: { type: "string", format: "date-time" },
                            updatedAt: { type: "string", format: "date-time" },
                            latestMessage: {
                                type: "object",
                                properties: {
                                    text: { type: "string" },
                                    read: { type: "boolean" },
                                    createdAt: { type: "string", format: "date-time" },
                                    sender: {
                                        type: "object",
                                        properties: {
                                            _id: { type: "string" },
                                            name: { type: "string" },
                                        },
                                    },
                                },
                            },
                            unreadCount: { type: "number", example: 0 },
                        },
                    },
                },
            },
        },
    }),
    __param(0, (0, common_1.Param)("userId")),
    __param(1, (0, common_1.Query)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, pagination_dto_1.PaginationDto]),
    __metadata("design:returntype", Promise)
], ChatController.prototype, "getConversationsByUserId", null);
__decorate([
    (0, common_1.Get)("admin/conversation"),
    (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard, permissions_guard_1.PermissionsGuard),
    (0, require_permission_decorator_1.RequirePermission)("bookings"),
    (0, swagger_1.ApiOperation)({
        summary: "Admin: get the conversation + paginated messages between a customer and provider",
    }),
    (0, swagger_1.ApiQuery)({ name: "customerId", required: true, type: String }),
    (0, swagger_1.ApiQuery)({ name: "providerId", required: true, type: String }),
    (0, swagger_1.ApiQuery)({ name: "page", required: false, type: Number }),
    (0, swagger_1.ApiQuery)({ name: "limit", required: false, type: Number }),
    __param(0, (0, common_1.Query)("customerId")),
    __param(1, (0, common_1.Query)("providerId")),
    __param(2, (0, common_1.Query)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String, pagination_dto_1.PaginationDto]),
    __metadata("design:returntype", Promise)
], ChatController.prototype, "getAdminConversation", null);
__decorate([
    (0, common_1.Get)("admin/user/:userId/conversations"),
    (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard, permissions_guard_1.PermissionsGuard),
    (0, require_permission_decorator_1.RequirePermission)("users"),
    (0, swagger_1.ApiOperation)({ summary: "Admin: get paginated conversations for a user, with the other party + latest message" }),
    (0, swagger_1.ApiParam)({ name: "userId", required: true }),
    (0, swagger_1.ApiQuery)({ name: "page", required: false, type: Number }),
    (0, swagger_1.ApiQuery)({ name: "limit", required: false, type: Number }),
    __param(0, (0, common_1.Param)("userId")),
    __param(1, (0, common_1.Query)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, pagination_dto_1.PaginationDto]),
    __metadata("design:returntype", Promise)
], ChatController.prototype, "getAdminUserConversations", null);
__decorate([
    (0, common_1.Get)("admin/conversation/:conversationId/messages"),
    (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard, permissions_guard_1.PermissionsGuard),
    (0, require_permission_decorator_1.RequirePermission)("users"),
    (0, swagger_1.ApiOperation)({ summary: "Admin: get paginated messages for a specific conversation" }),
    (0, swagger_1.ApiParam)({ name: "conversationId", required: true }),
    (0, swagger_1.ApiQuery)({ name: "page", required: false, type: Number }),
    (0, swagger_1.ApiQuery)({ name: "limit", required: false, type: Number }),
    __param(0, (0, common_1.Param)("conversationId")),
    __param(1, (0, common_1.Query)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, pagination_dto_1.PaginationDto]),
    __metadata("design:returntype", Promise)
], ChatController.prototype, "getAdminConversationMessages", null);
exports.ChatController = ChatController = __decorate([
    (0, swagger_1.ApiTags)("Chat"),
    (0, common_1.Controller)("chat"),
    __metadata("design:paramtypes", [chat_service_1.ChatService,
        file_upload_service_1.FileUploadService])
], ChatController);
//# sourceMappingURL=chat.controller.js.map