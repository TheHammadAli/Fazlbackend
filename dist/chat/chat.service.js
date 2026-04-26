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
let ChatService = class ChatService {
    conversationModel;
    messageModel;
    userService;
    shopService;
    i18n;
    cls;
    constructor(conversationModel, messageModel, userService, shopService, i18n, cls) {
        this.conversationModel = conversationModel;
        this.messageModel = messageModel;
        this.userService = userService;
        this.shopService = shopService;
        this.i18n = i18n;
        this.cls = cls;
    }
    get lang() {
        return this.cls.get("lang") || "en";
    }
    async getOrCreateConversation(buyerId, sellerId) {
        await this.userService.findUserById(buyerId);
        await this.userService.findUserById(sellerId);
        const [user1, user2] = buyerId < sellerId ? [buyerId, sellerId] : [sellerId, buyerId];
        const buyerObjectId = new mongoose_2.Types.ObjectId(user1);
        const sellerObjectId = new mongoose_2.Types.ObjectId(user2);
        try {
            const convo = await this.conversationModel.findOneAndUpdate({
                buyer: buyerObjectId,
                seller: sellerObjectId,
            }, {
                $setOnInsert: {
                    buyer: buyerObjectId,
                    seller: sellerObjectId,
                    status: "open",
                },
            }, {
                upsert: true,
                new: true,
            });
            return convo;
        }
        catch (err) {
            if (err.code === 11000) {
                return this.conversationModel.findOne({
                    buyer: buyerObjectId,
                    seller: sellerObjectId,
                });
            }
            throw new app_error_1.AppError(err);
        }
    }
    async sendMessage(conversationId, senderId, receiverId, text) {
        await this.userService.findUserById(senderId);
        await this.userService.findUserById(receiverId);
        const conversation = await this.conversationModel.findById(conversationId);
        if (!conversation) {
            throw new common_1.NotFoundException(this.i18n.translate("chat.conversation_not_found", { lang: this.lang }));
        }
        const message = await this.messageModel.create({
            conversationId: new mongoose_2.Types.ObjectId(conversationId),
            sender: new mongoose_2.Types.ObjectId(senderId),
            receiver: new mongoose_2.Types.ObjectId(receiverId),
            text,
        });
        await this.conversationModel.findByIdAndUpdate(conversationId, {
            lastMessageAt: new Date(),
        });
        return message;
    }
    async getMessages(conversationId, paginationDto) {
        const convo = await this.conversationModel.findById(conversationId);
        if (!convo) {
            throw new common_1.NotFoundException(this.i18n.translate("chat.conversation_not_found", { lang: this.lang }));
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
            throw new common_1.NotFoundException(this.i18n.translate("chat.conversation_not_found", { lang: this.lang }));
        }
        await this.messageModel.updateMany({
            conversationId: new mongoose_2.Types.ObjectId(conversationId),
            receiver: new mongoose_2.Types.ObjectId(userId),
            read: false,
        }, { $set: { read: true } });
    }
    async getUnreadConversations(userId) {
        await this.userService.findUserById(userId);
        const userObjectId = new mongoose_2.Types.ObjectId(userId);
        const conversationsWithUnread = await this.messageModel.aggregate([
            { $match: { receiver: userObjectId, read: false } },
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
                    $project: {
                        _id: 1,
                        buyer: { _id: 1, name: 1, email: 1, profilePicture: 1 },
                        seller: { _id: 1, name: 1, email: 1, profilePicture: 1 },
                        status: 1,
                        lastMessageAt: 1,
                        createdAt: 1,
                        updatedAt: 1,
                        latestMessage: 1,
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
        nestjs_cls_1.ClsService])
], ChatService);
//# sourceMappingURL=chat.service.js.map