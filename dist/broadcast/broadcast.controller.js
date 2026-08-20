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
exports.BroadcastController = void 0;
const common_1 = require("@nestjs/common");
const swagger_1 = require("@nestjs/swagger");
const broadcast_service_1 = require("./broadcast.service");
const create_broadcast_dto_1 = require("./dto/create-broadcast.dto");
const send_broadcast_dto_1 = require("./dto/send-broadcast.dto");
const pagination_dto_1 = require("../common/dto/pagination.dto");
const jwt_auth_guard_1 = require("../auth/guard/jwt-auth-guard");
const permissions_guard_1 = require("../auth/guard/permissions-guard");
const require_permission_decorator_1 = require("../common/decorators/require-permission.decorator");
const require_action_decorator_1 = require("../common/decorators/require-action.decorator");
const current_user_decorator_1 = require("../common/decorators/current-user.decorator");
const activity_log_service_1 = require("../activity-log/activity-log.service");
const platform_express_1 = require("@nestjs/platform-express");
const file_upload_service_1 = require("../common/file-upload/file-upload.service");
let BroadcastController = class BroadcastController {
    broadcastService;
    fileUploadService;
    activityLogService;
    constructor(broadcastService, fileUploadService, activityLogService) {
        this.broadcastService = broadcastService;
        this.fileUploadService = fileUploadService;
        this.activityLogService = activityLogService;
    }
    async createBroadcast(dto, req, files) {
        const user = req.user;
        const buyerId = user.sub;
        let location = user.location;
        if (dto.location) {
            location = typeof dto.location === "string"
                ? JSON.parse(dto.location)
                : dto.location;
        }
        let imageUrls = [];
        console.log("Received files for broadcast:", files);
        if (files?.length) {
            imageUrls = await Promise.all(files.map((file) => this.fileUploadService.uploadBroadcastImage(buyerId, file)));
        }
        console.log("Final image URLs for broadcast:", imageUrls);
        return this.broadcastService.createBroadcastAndDispatch(dto, buyerId, location, imageUrls);
    }
    async sendMessage(broadcastId, dto, req, file) {
        const user = req.user;
        const senderId = user.sub;
        const lang = (req.headers["accept-language"] || "en").split(",")[0];
        let imageUrl;
        if (file) {
            imageUrl = await this.fileUploadService.uploadBroadcastThreadImage(dto.threadId, file);
        }
        return this.broadcastService.sendBroadcastMessage(broadcastId, senderId, dto.receiverId, dto.threadId, dto.message, imageUrl);
    }
    async getThreads(broadcastId, req) {
        const user = req.user;
        return this.broadcastService.getBroadcastThreads(broadcastId, user.sub);
    }
    async getThreadMessages(broadcastId, threadId, req) {
        const user = req.user;
        return this.broadcastService.getThreadMessages(threadId, user.sub);
    }
    async markThreadAsRead(broadcastId, threadId, req) {
        const user = req.user;
        return this.broadcastService.markThreadMessagesAsRead(threadId, user.sub);
    }
    async getMyBroadcasts(req, paginationDto) {
        const user = req.user;
        return this.broadcastService.getBroadcastsByBuyer(user.sub, paginationDto.page, paginationDto.limit);
    }
    async getReceivedBroadcasts(req, paginationDto) {
        const user = req.user;
        return this.broadcastService.getBroadcastsForSeller(user.sub, paginationDto.page, paginationDto.limit);
    }
    async getAllBroadcastsForAdmin(page = 1, limit = 10, search, status, startDate, endDate) {
        return this.broadcastService.getAllBroadcastsForAdmin(page, limit, search, status, startDate, endDate);
    }
    async getBroadcastDetail(broadcastId) {
        return this.broadcastService.getBroadcastDetailForAdmin(broadcastId);
    }
    async getBroadcastRecipients(broadcastId) {
        return this.broadcastService.getBroadcastRecipients(broadcastId);
    }
    async getAdminThreadMessages(broadcastId, sellerId, paginationDto) {
        return this.broadcastService.getAdminThreadMessages(broadcastId, sellerId, paginationDto);
    }
    async closeBroadcast(broadcastId) {
        return this.broadcastService.closeBroadcast(broadcastId);
    }
    async deleteBroadcast(broadcastId, currentUser, req) {
        const result = await this.broadcastService.deleteBroadcast(broadcastId);
        await this.activityLogService.record(currentUser.sub, "broadcast_deleted", "Broadcast", broadcastId, result.data?.message, req.ip);
        return result;
    }
};
exports.BroadcastController = BroadcastController;
__decorate([
    (0, common_1.Post)("/create"),
    (0, swagger_1.ApiOperation)({ summary: "Create broadcast and dispatch sellers" }),
    (0, swagger_1.ApiConsumes)("application/json", "multipart/form-data"),
    (0, swagger_1.ApiBody)({ type: create_broadcast_dto_1.CreateBroadcastDto }),
    (0, common_1.UseInterceptors)((0, platform_express_1.FilesInterceptor)("files", 5)),
    __param(0, (0, common_1.Body)()),
    __param(1, (0, common_1.Req)()),
    __param(2, (0, common_1.UploadedFiles)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [create_broadcast_dto_1.CreateBroadcastDto, Object, Array]),
    __metadata("design:returntype", Promise)
], BroadcastController.prototype, "createBroadcast", null);
__decorate([
    (0, common_1.Post)("/message/:id"),
    (0, swagger_1.ApiOperation)({ summary: "Send message in broadcast thread" }),
    (0, swagger_1.ApiParam)({ name: "id", description: "Broadcast ID" }),
    (0, swagger_1.ApiConsumes)("application/json", "multipart/form-data"),
    (0, common_1.UseInterceptors)((0, platform_express_1.FileInterceptor)("file")),
    __param(0, (0, common_1.Param)("id")),
    __param(1, (0, common_1.Body)()),
    __param(2, (0, common_1.Req)()),
    __param(3, (0, common_1.UploadedFile)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, send_broadcast_dto_1.SendBroadcastMessageDto, Object, Object]),
    __metadata("design:returntype", Promise)
], BroadcastController.prototype, "sendMessage", null);
__decorate([
    (0, common_1.Get)("threads/:id"),
    (0, swagger_1.ApiOperation)({ summary: "Get all threads for a broadcast" }),
    __param(0, (0, common_1.Param)("id")),
    __param(1, (0, common_1.Req)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Object]),
    __metadata("design:returntype", Promise)
], BroadcastController.prototype, "getThreads", null);
__decorate([
    (0, common_1.Get)(":id/threads/:threadId"),
    (0, swagger_1.ApiOperation)({ summary: "Get messages for a thread" }),
    __param(0, (0, common_1.Param)("id")),
    __param(1, (0, common_1.Param)("threadId")),
    __param(2, (0, common_1.Req)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String, Object]),
    __metadata("design:returntype", Promise)
], BroadcastController.prototype, "getThreadMessages", null);
__decorate([
    (0, common_1.Patch)(":id/threads/:threadId/read"),
    (0, swagger_1.ApiOperation)({ summary: "Mark all unread messages in a thread as read" }),
    __param(0, (0, common_1.Param)("id")),
    __param(1, (0, common_1.Param)("threadId")),
    __param(2, (0, common_1.Req)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String, Object]),
    __metadata("design:returntype", Promise)
], BroadcastController.prototype, "markThreadAsRead", null);
__decorate([
    (0, common_1.Get)("/my/broadcasts"),
    (0, swagger_1.ApiOperation)({ summary: "Get broadcasts created by logged-in user (buyer)" }),
    (0, swagger_1.ApiQuery)({ name: "page", required: false, type: Number }),
    (0, swagger_1.ApiQuery)({ name: "limit", required: false, type: Number }),
    (0, swagger_1.ApiResponse)({
        status: 200,
        description: "Paginated broadcasts created by buyer",
    }),
    __param(0, (0, common_1.Req)()),
    __param(1, (0, common_1.Query)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, pagination_dto_1.PaginationDto]),
    __metadata("design:returntype", Promise)
], BroadcastController.prototype, "getMyBroadcasts", null);
__decorate([
    (0, common_1.Get)("/my/received"),
    (0, swagger_1.ApiOperation)({ summary: "Get broadcasts where logged-in user is a seller" }),
    (0, swagger_1.ApiQuery)({ name: "page", required: false, type: Number }),
    (0, swagger_1.ApiQuery)({ name: "limit", required: false, type: Number }),
    (0, swagger_1.ApiResponse)({
        status: 200,
        description: "Paginated broadcasts where user is seller",
    }),
    __param(0, (0, common_1.Req)()),
    __param(1, (0, common_1.Query)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, pagination_dto_1.PaginationDto]),
    __metadata("design:returntype", Promise)
], BroadcastController.prototype, "getReceivedBroadcasts", null);
__decorate([
    (0, common_1.Get)("admin/all"),
    (0, common_1.UseGuards)(permissions_guard_1.PermissionsGuard),
    (0, require_permission_decorator_1.RequirePermission)("broadcasts"),
    (0, swagger_1.ApiOperation)({ summary: "Get all broadcasts across all users, with analytics (admin)" }),
    (0, swagger_1.ApiQuery)({ name: "page", required: false, type: Number }),
    (0, swagger_1.ApiQuery)({ name: "limit", required: false, type: Number }),
    (0, swagger_1.ApiQuery)({ name: "search", required: false, type: String, description: "Search by buyer name or message text" }),
    (0, swagger_1.ApiQuery)({ name: "status", required: false, enum: ["open", "closed"] }),
    (0, swagger_1.ApiQuery)({ name: "startDate", required: false, type: String }),
    (0, swagger_1.ApiQuery)({ name: "endDate", required: false, type: String }),
    (0, swagger_1.ApiResponse)({ status: 200, description: "Paginated list of all broadcasts with view/response analytics" }),
    __param(0, (0, common_1.Query)("page")),
    __param(1, (0, common_1.Query)("limit")),
    __param(2, (0, common_1.Query)("search")),
    __param(3, (0, common_1.Query)("status")),
    __param(4, (0, common_1.Query)("startDate")),
    __param(5, (0, common_1.Query)("endDate")),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Number, Number, String, String, String, String]),
    __metadata("design:returntype", Promise)
], BroadcastController.prototype, "getAllBroadcastsForAdmin", null);
__decorate([
    (0, common_1.Get)("admin/:broadcastId"),
    (0, common_1.UseGuards)(permissions_guard_1.PermissionsGuard),
    (0, require_permission_decorator_1.RequirePermission)("broadcasts"),
    (0, swagger_1.ApiOperation)({ summary: "Get full broadcast detail (admin)" }),
    (0, swagger_1.ApiParam)({ name: "broadcastId", required: true }),
    (0, swagger_1.ApiResponse)({ status: 200, description: "Full broadcast details including location, category, and photos" }),
    __param(0, (0, common_1.Param)("broadcastId")),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", Promise)
], BroadcastController.prototype, "getBroadcastDetail", null);
__decorate([
    (0, common_1.Get)("admin/:broadcastId/recipients"),
    (0, common_1.UseGuards)(permissions_guard_1.PermissionsGuard),
    (0, require_permission_decorator_1.RequirePermission)("broadcasts"),
    (0, swagger_1.ApiOperation)({ summary: "Get recipient sellers for a broadcast (admin)" }),
    (0, swagger_1.ApiParam)({ name: "broadcastId", required: true }),
    (0, swagger_1.ApiResponse)({ status: 200, description: "List of sellers who received this broadcast" }),
    __param(0, (0, common_1.Param)("broadcastId")),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", Promise)
], BroadcastController.prototype, "getBroadcastRecipients", null);
__decorate([
    (0, common_1.Get)("admin/:broadcastId/recipients/:sellerId/messages"),
    (0, common_1.UseGuards)(permissions_guard_1.PermissionsGuard),
    (0, require_permission_decorator_1.RequirePermission)("broadcasts"),
    (0, swagger_1.ApiOperation)({ summary: "Get paginated thread messages for one broadcast recipient (admin)" }),
    (0, swagger_1.ApiParam)({ name: "broadcastId", required: true }),
    (0, swagger_1.ApiParam)({ name: "sellerId", required: true }),
    (0, swagger_1.ApiQuery)({ name: "page", required: false, type: Number }),
    (0, swagger_1.ApiQuery)({ name: "limit", required: false, type: Number }),
    (0, swagger_1.ApiResponse)({ status: 200, description: "Thread + paginated messages for this broadcast/recipient pair" }),
    __param(0, (0, common_1.Param)("broadcastId")),
    __param(1, (0, common_1.Param)("sellerId")),
    __param(2, (0, common_1.Query)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String, pagination_dto_1.PaginationDto]),
    __metadata("design:returntype", Promise)
], BroadcastController.prototype, "getAdminThreadMessages", null);
__decorate([
    (0, common_1.Patch)("admin/:broadcastId/close"),
    (0, common_1.UseGuards)(permissions_guard_1.PermissionsGuard),
    (0, require_permission_decorator_1.RequirePermission)("broadcasts"),
    (0, require_action_decorator_1.RequireAction)("edit"),
    (0, swagger_1.ApiOperation)({ summary: "Close a broadcast (admin)" }),
    (0, swagger_1.ApiParam)({ name: "broadcastId", required: true }),
    __param(0, (0, common_1.Param)("broadcastId")),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", Promise)
], BroadcastController.prototype, "closeBroadcast", null);
__decorate([
    (0, common_1.Delete)("admin/:broadcastId"),
    (0, common_1.UseGuards)(permissions_guard_1.PermissionsGuard),
    (0, require_permission_decorator_1.RequirePermission)("broadcasts"),
    (0, require_action_decorator_1.RequireAction)("delete"),
    (0, swagger_1.ApiOperation)({ summary: "Delete a broadcast (admin, soft delete)" }),
    (0, swagger_1.ApiParam)({ name: "broadcastId", required: true }),
    __param(0, (0, common_1.Param)("broadcastId")),
    __param(1, (0, current_user_decorator_1.CurrentUser)()),
    __param(2, (0, common_1.Req)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Object, Object]),
    __metadata("design:returntype", Promise)
], BroadcastController.prototype, "deleteBroadcast", null);
exports.BroadcastController = BroadcastController = __decorate([
    (0, swagger_1.ApiTags)("Broadcast"),
    (0, swagger_1.ApiBearerAuth)("jwt"),
    (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard),
    (0, common_1.Controller)("broadcast"),
    __metadata("design:paramtypes", [broadcast_service_1.BroadcastService,
        file_upload_service_1.FileUploadService,
        activity_log_service_1.ActivityLogService])
], BroadcastController);
//# sourceMappingURL=broadcast.controller.js.map