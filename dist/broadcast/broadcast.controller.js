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
const jwt_auth_guard_1 = require("../auth/guard/jwt-auth-guard");
let BroadcastController = class BroadcastController {
    broadcastService;
    constructor(broadcastService) {
        this.broadcastService = broadcastService;
    }
    async createBroadcast(dto, req) {
        const user = req.user;
        console.log('user', user);
        const buyerId = user.sub;
        const location = user.location;
        return this.broadcastService.createBroadcastAndDispatch(dto, buyerId, location);
    }
    async sendMessage(broadcastId, dto, req) {
        const user = req.user;
        const senderId = user.sub;
        return this.broadcastService.sendBroadcastMessage(broadcastId, senderId, dto.receiverId, dto.threadId, dto.message);
    }
    async getThreads(broadcastId) {
        return this.broadcastService.getBroadcastThreads(broadcastId);
    }
    async getThreadMessages(broadcastId, threadId) {
        return this.broadcastService.getThreadMessages(threadId);
    }
};
exports.BroadcastController = BroadcastController;
__decorate([
    (0, common_1.Post)("/create"),
    (0, swagger_1.ApiOperation)({ summary: 'Create broadcast and dispatch sellers' }),
    __param(0, (0, common_1.Body)()),
    __param(1, (0, common_1.Req)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [create_broadcast_dto_1.CreateBroadcastDto, Object]),
    __metadata("design:returntype", Promise)
], BroadcastController.prototype, "createBroadcast", null);
__decorate([
    (0, common_1.Post)('/message/:id'),
    (0, swagger_1.ApiOperation)({ summary: 'Send message in broadcast thread' }),
    (0, swagger_1.ApiParam)({ name: 'id', description: 'Broadcast ID' }),
    __param(0, (0, common_1.Param)('id')),
    __param(1, (0, common_1.Body)()),
    __param(2, (0, common_1.Req)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, send_broadcast_dto_1.SendBroadcastMessageDto, Object]),
    __metadata("design:returntype", Promise)
], BroadcastController.prototype, "sendMessage", null);
__decorate([
    (0, common_1.Get)('threads/:id'),
    (0, swagger_1.ApiOperation)({ summary: 'Get all threads for a broadcast' }),
    __param(0, (0, common_1.Param)('id')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", Promise)
], BroadcastController.prototype, "getThreads", null);
__decorate([
    (0, common_1.Get)(':id/threads/:threadId'),
    (0, swagger_1.ApiOperation)({ summary: 'Get messages for a thread' }),
    __param(0, (0, common_1.Param)('id')),
    __param(1, (0, common_1.Param)('threadId')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String]),
    __metadata("design:returntype", Promise)
], BroadcastController.prototype, "getThreadMessages", null);
exports.BroadcastController = BroadcastController = __decorate([
    (0, swagger_1.ApiTags)('Broadcast'),
    (0, swagger_1.ApiBearerAuth)('jwt'),
    (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard),
    (0, common_1.Controller)('broadcast'),
    __metadata("design:paramtypes", [broadcast_service_1.BroadcastService])
], BroadcastController);
//# sourceMappingURL=broadcast.controller.js.map