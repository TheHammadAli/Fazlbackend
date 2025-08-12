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
exports.ChatService = void 0;
const common_1 = require("@nestjs/common");
const mongoose_1 = require("@nestjs/mongoose");
const mongoose_2 = require("mongoose");
const conversation_schema_1 = require("./schema/conversation.schema");
const message_schema_1 = require("./schema/message.schema");
const users_service_1 = require("../users/users.service");
const app_error_1 = require("../common/exceptions/app-error");
const shop_service_1 = require("../shop/shop.service");
let ChatService = class ChatService {
    conversationModel;
    messageModel;
    userService;
    shopService;
    constructor(conversationModel, messageModel, userService, shopService) {
        this.conversationModel = conversationModel;
        this.messageModel = messageModel;
        this.userService = userService;
        this.shopService = shopService;
    }
    async getOrCreateConversation(buyerId, sellerId) {
        await this.userService.findUserById(buyerId);
        await this.userService.findUserById(sellerId);
        try {
            const convo = await this.conversationModel.findOneAndUpdate({ buyer: buyerId, seller: sellerId }, { $setOnInsert: { buyer: buyerId, seller: sellerId } }, { upsert: true, new: true });
            return convo;
        }
        catch (err) {
            throw new app_error_1.AppError(err);
        }
    }
    async sendMessage(conversationId, senderId, receiverId, text) {
        await this.userService.findUserById(senderId);
        await this.userService.findUserById(receiverId);
        const conversation = await this.conversationModel.findById(conversationId);
        if (!conversation)
            throw new common_1.NotFoundException('Conversation not found');
        const message = await this.messageModel.create({
            conversationId,
            sender: senderId,
            receiver: receiverId,
            text,
        });
        await this.conversationModel.findByIdAndUpdate(conversationId, {
            lastMessageAt: new Date(),
        });
        return message;
    }
    async getMessages(conversationId, paginationDto) {
        const convo = await this.conversationModel.findById(conversationId);
        if (!convo)
            throw new common_1.NotFoundException('Conversation not found');
        const { page = 1, limit = 10 } = paginationDto;
        const skip = (page - 1) * limit;
        const [data, total] = await Promise.all([
            this.messageModel
                .find({ conversationId })
                .sort({ createdAt: -1 })
                .skip(skip)
                .limit(limit),
            this.messageModel.countDocuments({ conversationId }),
        ]);
        return {
            data,
            meta: {
                total,
                page,
                limit,
                totalPages: Math.ceil(total / limit),
            },
        };
    }
    async markAsRead(conversationId, userId) {
        await this.userService.findUserById(userId);
        const convo = await this.conversationModel.findById(conversationId);
        if (!convo)
            throw new common_1.NotFoundException('Conversation not found');
        await this.messageModel.updateMany({ conversationId, receiver: userId, read: false }, { $set: { read: true } });
    }
    async getUnreadConversations(userId) {
        await this.userService.findUserById(userId);
        const conversationsWithUnread = await this.messageModel.aggregate([
            { $match: { receiver: userId, read: false } },
            {
                $group: {
                    _id: '$conversationId',
                    unreadCount: { $sum: 1 },
                    lastMessageAt: { $max: '$createdAt' },
                },
            },
            {
                $sort: { lastMessageAt: -1 },
            },
        ]);
        return conversationsWithUnread;
    }
    async broadcastMessageToNearbySellers(buyerId, location, radiusInKm, messageText) {
        await this.userService.findUserById(buyerId);
        const radiusInMeters = radiusInKm * 1000;
        const nearbyShops = await this.shopService.findShopsNearLocation(location, radiusInMeters);
        if (!nearbyShops.length) {
            return { message: 'No nearby sellers found', count: 0 };
        }
        const sellerIds = nearbyShops.map((shop) => shop.ownerId.toString());
        const convoPromises = sellerIds.map((sellerId) => this.getOrCreateConversation(buyerId, sellerId));
        const convoResults = await Promise.allSettled(convoPromises);
        const messagePromises = convoResults
            .map((result, idx) => {
            if (result.status === 'fulfilled') {
                return this.sendMessage(result.value.id.toString(), buyerId, sellerIds[idx], messageText);
            }
            return null;
        })
            .filter(Boolean);
        const messageResults = await Promise.allSettled(messagePromises);
        return {
            message: 'Broadcast complete',
            data: {
                totalTargets: sellerIds.length,
                successfulMessages: messageResults.filter((r) => r.status === 'fulfilled').length,
                failedMessages: messageResults.filter((r) => r.status === 'rejected')
                    .length,
                detailedResults: messageResults,
            },
        };
    }
};
exports.ChatService = ChatService;
exports.ChatService = ChatService = __decorate([
    (0, common_1.Injectable)(),
    __param(0, (0, mongoose_1.InjectModel)(conversation_schema_1.Conversation.name)),
    __param(1, (0, mongoose_1.InjectModel)(message_schema_1.Message.name)),
    __metadata("design:paramtypes", [mongoose_2.Model,
        mongoose_2.Model,
        users_service_1.UsersService,
        shop_service_1.ShopService])
], ChatService);
//# sourceMappingURL=chat.service.js.map