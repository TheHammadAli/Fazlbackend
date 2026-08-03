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
const platform_express_1 = require("@nestjs/platform-express");
const file_upload_service_1 = require("../common/file-upload/file-upload.service");
let BroadcastController = class BroadcastController {
    broadcastService;
    fileUploadService;
    constructor(broadcastService, fileUploadService) {
        this.broadcastService = broadcastService;
        this.fileUploadService = fileUploadService;
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
exports.BroadcastController = BroadcastController = __decorate([
    (0, swagger_1.ApiTags)("Broadcast"),
    (0, swagger_1.ApiBearerAuth)("jwt"),
    (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard),
    (0, common_1.Controller)("broadcast"),
    __metadata("design:paramtypes", [broadcast_service_1.BroadcastService,
        file_upload_service_1.FileUploadService])
], BroadcastController);
//# sourceMappingURL=broadcast.controller.js.map