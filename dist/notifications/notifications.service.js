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
exports.NotificationsService = void 0;
const common_1 = require("@nestjs/common");
const mongoose_1 = require("@nestjs/mongoose");
const mongoose_2 = require("mongoose");
const notifications_schema_1 = require("./schema/notifications.schema");
const users_service_1 = require("../users/users.service");
const firebase_service_1 = require("./firebase.service");
let NotificationsService = class NotificationsService {
    notificationModel;
    usersService;
    firebaseService;
    server;
    constructor(notificationModel, usersService, firebaseService) {
        this.notificationModel = notificationModel;
        this.usersService = usersService;
        this.firebaseService = firebaseService;
    }
    setServer(server) {
        this.server = server;
    }
    async create(userId, message, type = "MESSAGE") {
        const user = await this.usersService.findUserById(userId.toString());
        if (!user)
            throw new common_1.BadRequestException("User does not exist");
        const notif = new this.notificationModel({
            userId: new mongoose_2.Types.ObjectId(userId),
            message,
            type,
            read: false,
        });
        return notif.save();
    }
    async createAndNotify(userId, message, type = "MESSAGE") {
        const notif = await this.create(userId, message, type);
        if (this.server) {
            this.server.to(userId.toString()).emit("notification", notif);
        }
        const user = await this.usersService.findUserById(userId.toString());
        if (user?.fcmToken) {
            await this.firebaseService.sendNotification(user.fcmToken, "New Notification", message);
        }
        return notif;
    }
    async findByUser(userId, page = 1, limit = 10) {
        const user = await this.usersService.findUserById(userId.toString());
        if (!user)
            throw new common_1.BadRequestException("User does not exist");
        const skip = (page - 1) * limit;
        const total = await this.notificationModel
            .countDocuments({ userId: new mongoose_2.Types.ObjectId(userId) })
            .exec();
        const data = await this.notificationModel
            .find({ userId: new mongoose_2.Types.ObjectId(userId) })
            .sort({ createdAt: -1 })
            .skip(skip)
            .limit(limit)
            .exec();
        return {
            data: {
                notifications: data,
                total,
                page,
                limit,
                totalPages: Math.ceil(total / limit),
            },
        };
    }
    async markAsRead(id) {
        const notif = await this.notificationModel.findByIdAndUpdate(id, { read: true }, { new: true });
        if (!notif)
            throw new common_1.NotFoundException(`Notification ${id} not found`);
        return notif;
    }
    async delete(id) {
        const result = await this.notificationModel.findByIdAndDelete(id).exec();
        if (!result)
            throw new common_1.NotFoundException(`Notification ${id} not found`);
        return { deleted: true };
    }
    async getUnreadCount(userId) {
        const user = await this.usersService.findUserById(userId.toString());
        if (!user)
            throw new common_1.BadRequestException("User does not exist");
        return this.notificationModel
            .countDocuments({
            userId: new mongoose_2.Types.ObjectId(userId),
            read: false,
        })
            .exec();
    }
};
exports.NotificationsService = NotificationsService;
exports.NotificationsService = NotificationsService = __decorate([
    (0, common_1.Injectable)(),
    __param(0, (0, mongoose_1.InjectModel)(notifications_schema_1.Notification.name)),
    __param(1, (0, common_1.Inject)((0, common_1.forwardRef)(() => users_service_1.UsersService))),
    __metadata("design:paramtypes", [mongoose_2.Model,
        users_service_1.UsersService,
        firebase_service_1.FirebaseService])
], NotificationsService);
//# sourceMappingURL=notifications.service.js.map