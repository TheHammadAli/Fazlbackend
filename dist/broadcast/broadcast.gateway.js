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
exports.BroadcastGateway = void 0;
const websockets_1 = require("@nestjs/websockets");
const socket_io_1 = require("socket.io");
const broadcast_service_1 = require("./broadcast.service");
const common_1 = require("@nestjs/common");
let BroadcastGateway = class BroadcastGateway {
    broadcastService;
    server;
    static serverInstance;
    logger = new common_1.Logger("BroadcastGateway");
    constructor(broadcastService) {
        this.broadcastService = broadcastService;
    }
    handleConnection(client) {
        this.logger.log(`Client connected: ${client.id}`);
    }
    handleDisconnect(client) {
        this.logger.log(`Client disconnected: ${client.id}`);
    }
    async handleJoinThread(data, client) {
        client.join(data.threadId);
        this.logger.log(`Client ${client.id} joined thread ${data.threadId}`);
    }
    async handleSendBroadcastMessage(data, client) {
        const newMessage = await this.broadcastService.sendBroadcastMessage(data.broadcastId, data.senderId, data.receiverId, data.threadId, data.message);
    }
    async handleJoinBroadcast(data, client) {
        client.join(data.broadcastId);
        client.join(data.threadId);
        this.logger.log(`Client ${client.id} joined broadcast ${data.broadcastId} and thread ${data.threadId}`);
    }
    async handleLeaveBroadcast(data, client) {
        client.leave(data.threadId);
        client.leave(data.broadcastId);
        this.logger.log(`Client ${client.id} left broadcast ${data.broadcastId} and thread ${data.threadId}`);
    }
};
exports.BroadcastGateway = BroadcastGateway;
__decorate([
    (0, websockets_1.WebSocketServer)(),
    __metadata("design:type", socket_io_1.Server)
], BroadcastGateway.prototype, "server", void 0);
__decorate([
    (0, websockets_1.SubscribeMessage)("joinThread"),
    __param(0, (0, websockets_1.MessageBody)()),
    __param(1, (0, websockets_1.ConnectedSocket)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, socket_io_1.Socket]),
    __metadata("design:returntype", Promise)
], BroadcastGateway.prototype, "handleJoinThread", null);
__decorate([
    (0, websockets_1.SubscribeMessage)("sendBroadcastMessage"),
    __param(0, (0, websockets_1.MessageBody)()),
    __param(1, (0, websockets_1.ConnectedSocket)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, socket_io_1.Socket]),
    __metadata("design:returntype", Promise)
], BroadcastGateway.prototype, "handleSendBroadcastMessage", null);
__decorate([
    (0, websockets_1.SubscribeMessage)("joinBroadcast"),
    __param(0, (0, websockets_1.MessageBody)()),
    __param(1, (0, websockets_1.ConnectedSocket)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, socket_io_1.Socket]),
    __metadata("design:returntype", Promise)
], BroadcastGateway.prototype, "handleJoinBroadcast", null);
__decorate([
    (0, websockets_1.SubscribeMessage)("leaveBroadcast"),
    __param(0, (0, websockets_1.MessageBody)()),
    __param(1, (0, websockets_1.ConnectedSocket)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, socket_io_1.Socket]),
    __metadata("design:returntype", Promise)
], BroadcastGateway.prototype, "handleLeaveBroadcast", null);
exports.BroadcastGateway = BroadcastGateway = __decorate([
    (0, websockets_1.WebSocketGateway)({
        cors: {
            origin: "*",
        },
    }),
    __param(0, (0, common_1.Inject)((0, common_1.forwardRef)(() => broadcast_service_1.BroadcastService))),
    __metadata("design:paramtypes", [broadcast_service_1.BroadcastService])
], BroadcastGateway);
//# sourceMappingURL=broadcast.gateway.js.map