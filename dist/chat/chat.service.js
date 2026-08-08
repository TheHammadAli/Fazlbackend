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
const nestjs_i18n_1 = require("nestjs-i18n");
const conversation_schema_1 = require("./schema/conversation.schema");
const message_schema_1 = require("./schema/message.schema");
const users_service_1 = require("../users/users.service");
const app_error_1 = require("../common/exceptions/app-error");
const shop_service_1 = require("../shop/shop.service");
const nestjs_cls_1 = require("nestjs-cls");
const notifications_service_1 = require("../notifications/notifications.service");
const chat_gateway_1 = require("./chat.gateway");
let ChatService = class ChatService {
    conversationModel;
    messageModel;
    userService;
    shopService;
    i18n;
    cls;
    notificationsService;
    chatGateway;
    constructor(conversationModel, messageModel, userService, shopService, i18n, cls, notificationsService, chatGateway) {
        this.conversationModel = conversationModel;
        this.messageModel = messageModel;
        this.userService = userService;
        this.shopService = shopService;
        this.i18n = i18n;
        this.cls = cls;
        this.notificationsService = notificationsService;
        this.chatGateway = chatGateway;
    }
    get lang() {
        return this.cls.get("lang") || "en";
    }
    async getOrCreateConversation(buyerId, sellerId) {
        const buyer = await this.userService.findUserById(buyerId);
        const seller = await this.userService.findUserById(sellerId);
        if (!buyer || !seller) {
            throw new common_1.NotFoundException(this.i18n.translate("auth.chat.user_not_found", { lang: this.lang }));
        }
        const buyerObjectId = new mongoose_2.Types.ObjectId(buyerId);
        const sellerObjectId = new mongoose_2.Types.ObjectId(sellerId);
        let convo = await this.conversationModel.findOne({
            buyer: buyerObjectId,
            seller: sellerObjectId,
        });
        if (convo) {
            return convo;
        }
        const reversedConvo = await this.conversationModel.findOne({
            buyer: sellerObjectId,
            seller: buyerObjectId,
        });
        if (reversedConvo) {
            reversedConvo.buyer = buyerObjectId;
            reversedConvo.seller = sellerObjectId;
            await reversedConvo.save();
            return reversedConvo;
        }
        try {
            convo = await this.conversationModel.create({
                buyer: buyerObjectId,
                seller: sellerObjectId,
                status: "open",
            });
            return convo;
        }
        catch (err) {
            throw new app_error_1.AppError(err);
        }
    }
    async sendMessage(conversationId, senderId, receiverId, text, imageUrl) {
        const conversation = await this.conversationModel.findById(conversationId);
        if (!conversation) {
            throw new common_1.NotFoundException(this.i18n.translate("auth.chat.conversation_not_found", {
                lang: this.lang,
            }));
        }
        if (senderId !== conversation.buyer.toString() &&
            senderId !== conversation.seller.toString()) {
            throw new common_1.NotFoundException(this.i18n.translate("auth.chat.user_not_in_conversation", {
                lang: this.lang,
            }));
        }
        const computedReceiverId = senderId === conversation.buyer.toString()
            ? conversation.seller.toString()
            : conversation.buyer.toString();
        if (receiverId !== computedReceiverId) {
            throw new common_1.NotFoundException(this.i18n.translate("auth.chat.user_not_in_conversation", {
                lang: this.lang,
            }));
        }
        const [sender, receiver] = await Promise.all([
            this.userService.findUserById(senderId),
            this.userService.findUserById(computedReceiverId),
        ]);
        if (!sender || !receiver) {
            throw new common_1.NotFoundException(this.i18n.translate("auth.chat.user_not_found", { lang: this.lang }));
        }
        const message = await this.messageModel.create({
            conversationId: new mongoose_2.Types.ObjectId(conversationId),
            sender: new mongoose_2.Types.ObjectId(senderId),
            receiver: new mongoose_2.Types.ObjectId(computedReceiverId),
            text,
            imageUrl,
            read: false,
        });
        await this.conversationModel.findByIdAndUpdate(conversationId, {
            lastMessageAt: new Date(),
        });
        await this.notificationsService.createAndNotify(computedReceiverId, "chat.new_message", "MESSAGE", {
            conversation: {
                id: conversation._id,
                buyer: conversation.buyer,
                seller: conversation.seller,
                status: conversation.status,
            },
            message: {
                id: message._id,
                text: message.text,
                imageUrl: message.imageUrl,
                createdAt: message.createdAt,
            },
            sender: {
                id: sender._id,
                name: sender.name,
                image: sender.image,
            },
        }, { senderName: sender.name }, sender.name);
        this.chatGateway.server
            .to(conversationId)
            .emit("receiveMessage", {
            message,
            sender,
            conversation,
        });
        return {
            data: {
                message,
                sender,
                conversation,
            },
        };
    }
    async getMessages(conversationId, paginationDto) {
        const convo = await this.conversationModel.findById(conversationId);
        if (!convo) {
            throw new common_1.NotFoundException(this.i18n.translate("auth.chat.conversation_not_found", {
                lang: this.lang,
            }));
        }
        const { page = 1, limit = 10 } = paginationDto;
        const skip = (page - 1) * limit;
        const [data, total] = await Promise.all([
            this.messageModel
                .find({ conversationId: new mongoose_2.Types.ObjectId(conversationId) })
                .sort({ createdAt: -1 })
                .skip(skip)
                .limit(limit),
            this.messageModel.countDocuments({
                conversationId: new mongoose_2.Types.ObjectId(conversationId),
            }),
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
        if (!convo) {
            throw new common_1.NotFoundException(this.i18n.translate("auth.chat.conversation_not_found", {
                lang: this.lang,
            }));
        }
        const conversationObjectId = new mongoose_2.Types.ObjectId(conversationId);
        const receiverObjectId = new mongoose_2.Types.ObjectId(userId);
        await this.messageModel.updateMany({
            conversationId: conversationObjectId,
            receiver: receiverObjectId,
            read: false,
        }, { $set: { read: true } });
        return { success: true };
    }
    async getUnreadConversations(userId) {
        await this.userService.findUserById(userId);
        const userObjectId = new mongoose_2.Types.ObjectId(userId);
        const conversationsWithUnread = await this.messageModel.aggregate([
            {
                $match: {
                    receiver: userObjectId,
                    read: false,
                    sender: { $ne: userObjectId },
                },
            },
            {
                $group: {
                    _id: "$conversationId",
                    unreadCount: { $sum: 1 },
                    lastMessageAt: { $max: "$createdAt" },
                },
            },
            {
                $sort: { lastMessageAt: -1 },
            },
        ]);
        return conversationsWithUnread;
    }
    async getConversationsByUserId(userId, paginationDto) {
        await this.userService.findUserById(userId);
        const userObjectId = new mongoose_2.Types.ObjectId(userId);
        const { page = 1, limit = 10 } = paginationDto;
        const skip = (page - 1) * limit;
        const [data, totalResult] = await Promise.all([
            this.conversationModel.aggregate([
                {
                    $match: {
                        $or: [{ buyer: userObjectId }, { seller: userObjectId }],
                    },
                },
                {
                    $lookup: {
                        from: "users",
                        localField: "buyer",
                        foreignField: "_id",
                        as: "buyer",
                    },
                },
                {
                    $unwind: {
                        path: "$buyer",
                        preserveNullAndEmptyArrays: true,
                    },
                },
                {
                    $lookup: {
                        from: "users",
                        localField: "seller",
                        foreignField: "_id",
                        as: "seller",
                    },
                },
                {
                    $unwind: {
                        path: "$seller",
                        preserveNullAndEmptyArrays: true,
                    },
                },
                {
                    $lookup: {
                        from: "messages",
                        let: { conversationId: "$_id" },
                        pipeline: [
                            {
                                $match: {
                                    $expr: { $eq: ["$conversationId", "$$conversationId"] },
                                },
                            },
                            {
                                $sort: { createdAt: -1 },
                            },
                            {
                                $limit: 1,
                            },
                            {
                                $lookup: {
                                    from: "users",
                                    localField: "sender",
                                    foreignField: "_id",
                                    as: "sender",
                                },
                            },
                            {
                                $unwind: {
                                    path: "$sender",
                                    preserveNullAndEmptyArrays: true,
                                },
                            },
                            {
                                $project: {
                                    text: 1,
                                    read: 1,
                                    createdAt: 1,
                                    sender: { _id: 1, name: 1 },
                                },
                            },
                        ],
                        as: "latestMessage",
                    },
                },
                {
                    $unwind: {
                        path: "$latestMessage",
                        preserveNullAndEmptyArrays: true,
                    },
                },
                {
                    $lookup: {
                        from: "messages",
                        let: { conversationId: "$_id", currentUserId: userObjectId },
                        pipeline: [
                            {
                                $match: {
                                    $expr: {
                                        $and: [
                                            { $eq: ["$conversationId", "$$conversationId"] },
                                            { $eq: ["$receiver", "$$currentUserId"] },
                                            { $eq: ["$read", false] },
                                            { $ne: ["$sender", "$$currentUserId"] },
                                        ],
                                    },
                                },
                            },
                            { $count: "count" },
                        ],
                        as: "unreadMessages",
                    },
                },
                {
                    $addFields: {
                        unreadCount: {
                            $ifNull: [{ $arrayElemAt: ["$unreadMessages.count", 0] }, 0],
                        },
                    },
                },
                {
                    $project: {
                        _id: 1,
                        buyer: { _id: 1, name: 1, email: 1, image: 1 },
                        seller: { _id: 1, name: 1, email: 1, image: 1 },
                        status: 1,
                        lastMessageAt: 1,
                        createdAt: 1,
                        updatedAt: 1,
                        latestMessage: 1,
                        unreadCount: 1,
                    },
                },
                {
                    $sort: { "latestMessage.createdAt": -1, lastMessageAt: -1 },
                },
                {
                    $skip: skip,
                },
                {
                    $limit: Number(limit),
                },
            ]),
            this.conversationModel.countDocuments({
                $or: [{ buyer: userObjectId }, { seller: userObjectId }],
            }),
        ]);
        return {
            data,
            meta: {
                total: totalResult,
                page,
                limit,
                totalPages: Math.ceil(totalResult / limit),
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
        shop_service_1.ShopService,
        nestjs_i18n_1.I18nService,
        nestjs_cls_1.ClsService,
        notifications_service_1.NotificationsService,
        chat_gateway_1.ChatGateway])
], ChatService);
//# sourceMappingURL=chat.service.js.map