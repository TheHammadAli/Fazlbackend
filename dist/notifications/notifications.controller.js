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
exports.NotificationsController = void 0;
const common_1 = require("@nestjs/common");
const swagger_1 = require("@nestjs/swagger");
const notifications_service_1 = require("./notifications.service");
const get_notifications_query_dto_1 = require("./dto/get-notifications-query.dto");
const jwt_auth_guard_1 = require("../auth/guard/jwt-auth-guard");
let NotificationsController = class NotificationsController {
    notificationsService;
    constructor(notificationsService) {
        this.notificationsService = notificationsService;
    }
    async createNotification(userId, message, type) {
        return this.notificationsService.create(userId, message, type);
    }
    async getUserNotifications(userId, query) {
        const { page = 1, limit = 10 } = query;
        return this.notificationsService.findByUser(userId, page, limit);
    }
    async getUnreadNotificationCount(userId) {
        const count = await this.notificationsService.getUnreadCount(userId);
        return { count };
    }
    async markAsRead(id) {
        return this.notificationsService.markAsRead(id);
    }
    async deleteNotification(id) {
        return this.notificationsService.delete(id);
    }
    async testNotification(body) {
        return this.notificationsService.createAndNotify(body.userId, body.message, "MESSAGE");
    }
};
exports.NotificationsController = NotificationsController;
__decorate([
    (0, common_1.Post)(),
    (0, swagger_1.ApiOperation)({ summary: "Create a new notification" }),
    (0, swagger_1.ApiBody)({
        schema: {
            type: "object",
            properties: {
                userId: { type: "string", example: "64fc91d9f7b9c1d4f9a8a123" },
                message: { type: "string", example: "Your order has been placed!" },
                type: {
                    type: "string",
                    example: "ORDER",
                    enum: ["ORDER", "MESSAGE", "PROMOTION"],
                },
            },
            required: ["userId", "message"],
        },
    }),
    (0, swagger_1.ApiResponse)({
        status: 201,
        description: "Notification created successfully",
    }),
    __param(0, (0, common_1.Body)("userId")),
    __param(1, (0, common_1.Body)("message")),
    __param(2, (0, common_1.Body)("type")),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String, String]),
    __metadata("design:returntype", Promise)
], NotificationsController.prototype, "createNotification", null);
__decorate([
    (0, common_1.Get)(":userId"),
    (0, swagger_1.ApiOperation)({ summary: "Get paginated notifications for a user" }),
    (0, swagger_1.ApiParam)({ name: "userId", description: "The ID of the user" }),
    (0, swagger_1.ApiQuery)({
        name: "page",
        required: false,
        type: Number,
        description: "Page number (1-based)",
        example: 1,
    }),
    (0, swagger_1.ApiQuery)({
        name: "limit",
        required: false,
        type: Number,
        description: "Items per page",
        example: 10,
    }),
    (0, swagger_1.ApiResponse)({ status: 200, description: "Paginated list of notifications" }),
    __param(0, (0, common_1.Param)("userId")),
    __param(1, (0, common_1.Query)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, get_notifications_query_dto_1.GetNotificationsQueryDto]),
    __metadata("design:returntype", Promise)
], NotificationsController.prototype, "getUserNotifications", null);
__decorate([
    (0, common_1.Get)(":userId/unread-count"),
    (0, swagger_1.ApiOperation)({ summary: "Get unread notification count for a user" }),
    (0, swagger_1.ApiParam)({ name: "userId", description: "The ID of the user" }),
    (0, swagger_1.ApiResponse)({
        status: 200,
        description: "Unread notification count",
        schema: {
            type: "object",
            properties: {
                count: { type: "number", example: 3 },
            },
        },
    }),
    __param(0, (0, common_1.Param)("userId")),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", Promise)
], NotificationsController.prototype, "getUnreadNotificationCount", null);
__decorate([
    (0, common_1.Patch)(":id/read"),
    (0, swagger_1.ApiOperation)({ summary: "Mark a notification as read" }),
    (0, swagger_1.ApiParam)({ name: "id", description: "The ID of the notification" }),
    (0, swagger_1.ApiResponse)({ status: 200, description: "Notification marked as read" }),
    __param(0, (0, common_1.Param)("id")),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", Promise)
], NotificationsController.prototype, "markAsRead", null);
__decorate([
    (0, common_1.Delete)(":id"),
    (0, swagger_1.ApiOperation)({ summary: "Delete a notification" }),
    (0, swagger_1.ApiParam)({ name: "id", description: "The ID of the notification" }),
    (0, swagger_1.ApiResponse)({
        status: 200,
        description: "Notification deleted successfully",
    }),
    __param(0, (0, common_1.Param)("id")),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", Promise)
], NotificationsController.prototype, "deleteNotification", null);
__decorate([
    (0, common_1.Post)("test"),
    (0, swagger_1.ApiOperation)({ summary: "Send test notification to a user" }),
    (0, swagger_1.ApiBody)({
        schema: {
            type: "object",
            properties: {
                userId: {
                    type: "string",
                    example: "68507e7984b53996b8a7fe49",
                },
                message: {
                    type: "string",
                    example: "Hello from backend 🚀",
                },
            },
            required: ["userId", "message"],
        },
    }),
    (0, swagger_1.ApiResponse)({
        status: 201,
        description: "Notification created and sent successfully",
    }),
    __param(0, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", Promise)
], NotificationsController.prototype, "testNotification", null);
exports.NotificationsController = NotificationsController = __decorate([
    (0, swagger_1.ApiTags)("Notifications"),
    (0, swagger_1.ApiBearerAuth)("jwt"),
    (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard),
    (0, common_1.Controller)("notifications"),
    __metadata("design:paramtypes", [notifications_service_1.NotificationsService])
], NotificationsController);
//# sourceMappingURL=notifications.controller.js.map