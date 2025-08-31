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
Object.defineProperty(exports, "__esModule", { value: true });
exports.NotificationsGateway = void 0;
const websockets_1 = require("@nestjs/websockets");
const socket_io_1 = require("socket.io");
const notifications_service_1 = require("./notifications.service");
let NotificationsGateway = class NotificationsGateway {
    notificationsService;
    server;
    constructor(notificationsService) {
        this.notificationsService = notificationsService;
    }
    handleConnection(client) {
        const userId = client.handshake.query.userId;
        if (userId) {
            client.join(userId);
            console.log(`User ${userId} connected to notifications gateway`);
        }
        else {
            console.log('A client connected without userId, disconnecting...');
            client.disconnect();
        }
    }
    handleDisconnect(client) {
        const userId = client.handshake.query.userId;
        if (userId) {
            console.log(`User ${userId} disconnected`);
        }
    }
    async sendNotification(userId, message) {
        const notif = await this.notificationsService.create(userId, message);
        this.server.to(userId.toString()).emit('notification', notif);
        return notif;
    }
};
exports.NotificationsGateway = NotificationsGateway;
__decorate([
    (0, websockets_1.WebSocketServer)(),
    __metadata("design:type", socket_io_1.Server)
], NotificationsGateway.prototype, "server", void 0);
exports.NotificationsGateway = NotificationsGateway = __decorate([
    (0, websockets_1.WebSocketGateway)({
        cors: {
            origin: '*',
        },
    }),
    __metadata("design:paramtypes", [notifications_service_1.NotificationsService])
], NotificationsGateway);
//# sourceMappingURL=notification.gateway.js.map