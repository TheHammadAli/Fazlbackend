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
exports.BroadcastService = void 0;
const common_1 = require("@nestjs/common");
const mongoose_1 = require("@nestjs/mongoose");
const mongoose_2 = require("mongoose");
const nestjs_i18n_1 = require("nestjs-i18n");
const broadcast_schema_1 = require("./schema/broadcast.schema");
const broadcast_message_schema_1 = require("./schema/broadcast-message.schema");
const broadcast_thread_schema_1 = require("./schema/broadcast-thread.schema");
const counter_schema_1 = require("../common/schema/counter.schema");
const shop_service_1 = require("../shop/shop.service");
const users_service_1 = require("../users/users.service");
const category_service_1 = require("../category/category.service");
const services_service_1 = require("../services/services.service");
const products_service_1 = require("../products/products.service");
const notifications_service_1 = require("../notifications/notifications.service");
const nestjs_cls_1 = require("nestjs-cls");
const broadcast_gateway_1 = require("./broadcast.gateway");
let BroadcastService = class BroadcastService {
    broadcastModel;
    messageModel;
    threadModel;
    counterModel;
    shopService;
    categoryService;
    userService;
    servicesService;
    productsService;
    notificationsService;
    i18n;
    cls;
    broadcastGateway;
    constructor(broadcastModel, messageModel, threadModel, counterModel, shopService, categoryService, userService, servicesService, productsService, notificationsService, i18n, cls, broadcastGateway) {
        this.broadcastModel = broadcastModel;
        this.messageModel = messageModel;
        this.threadModel = threadModel;
        this.counterModel = counterModel;
        this.shopService = shopService;
        this.categoryService = categoryService;
        this.userService = userService;
        this.servicesService = servicesService;
        this.productsService = productsService;
        this.notificationsService = notificationsService;
        this.i18n = i18n;
        this.cls = cls;
        this.broadcastGateway = broadcastGateway;
    }
    get lang() {
        return this.cls.get("lang") || "en";
    }
    async generateNextBroadcastCode() {
        const counter = await this.counterModel.findByIdAndUpdate("broadcastCode", { $inc: { seq: 1 } }, { new: true, upsert: true });
        return `ECH-${String(counter.seq).padStart(6, "0")}`;
    }
    async createBroadcast(dto, buyerId, location) {
        const results = await this.userService.findUserById(buyerId);
        if (!results) {
            throw new common_1.NotFoundException(this.i18n.translate("auth.broadcast.user_not_found", {
                lang: this.lang,
            }));
        }
        const broadcastCode = await this.generateNextBroadcastCode();
        return this.broadcastModel.create({
            broadcastCode,
            buyer: new mongoose_2.Types.ObjectId(buyerId),
            message: dto.message,
            address: dto.address,
            purpose: dto.purpose,
            radius: dto.radius,
            category: new mongoose_2.Types.ObjectId(dto.categoryId),
            type: dto.type,
            location,
        });
    }
    async findNearbySellers(location, radiusKm, categoryId) {
        const radiusMeters = radiusKm * 1000;
        const sellerIds = await this.productsService.findNearbyProductShopOwnerIds(categoryId, location.coordinates, radiusMeters);
        console.log("Nearby sellers found:", sellerIds);
        return sellerIds;
    }
    async findNearbyServiceProviders(location, radiusKm, categoryId) {
        const radiusMeters = radiusKm * 1000;
        const services = await this.servicesService
            .getServiceModel()
            .find({
            location: {
                $near: {
                    $geometry: {
                        type: "Point",
                        coordinates: location.coordinates,
                    },
                    $maxDistance: radiusMeters,
                },
            },
            category: new mongoose_2.Types.ObjectId(categoryId),
            isDeleted: false,
            isDisabled: false,
        })
            .lean()
            .exec();
        console.log("Services found:", services);
        const ownerIds = [...new Set(services.map((s) => s.ownerId.toString()))];
        return ownerIds;
    }
    async findCategorybyId(categoryId) {
        return this.categoryService.findById(categoryId);
    }
    async createBroadcastThreads(broadcastId, sellerIds, buyerId) {
        const threadPromises = sellerIds.map((sellerId) => this.threadModel.findOneAndUpdate({
            broadcast: new mongoose_2.Types.ObjectId(broadcastId),
            seller: new mongoose_2.Types.ObjectId(sellerId),
        }, {
            broadcast: new mongoose_2.Types.ObjectId(broadcastId),
            buyer: new mongoose_2.Types.ObjectId(buyerId),
            seller: new mongoose_2.Types.ObjectId(sellerId),
        }, { upsert: true, new: true }));
        const threads = await Promise.all(threadPromises);
        return threads;
    }
    async createBroadcastAndDispatch(dto, buyerId, location, imageUrls) {
        console.log("Creating broadcast with DTO:", dto);
        const isCategoryValid = await this.findCategorybyId(dto.categoryId);
        if (!isCategoryValid) {
            throw new common_1.BadRequestException(this.i18n.translate("auth.broadcast.category_invalid", {
                lang: this.lang,
            }));
        }
        if (dto.type !== "product" && dto.type !== "service") {
            throw new common_1.BadRequestException(this.i18n.translate("auth.broadcast.type_invalid", { lang: this.lang }));
        }
        let sellerIds = [];
        if (dto.type === "product") {
            sellerIds = await this.findNearbySellers(location, dto.radius, dto.categoryId);
        }
        else if (dto.type === "service") {
            sellerIds = await this.findNearbyServiceProviders(location, dto.radius, dto.categoryId);
        }
        sellerIds = [...new Set(sellerIds.map((id) => id.toString()))];
        sellerIds = sellerIds.filter((id) => id !== buyerId.toString());
        if (!sellerIds.length) {
            throw new common_1.BadRequestException(this.i18n.translate(dto.purpose === "Buying" ? "auth.broadcast.no_sellers_found" : "auth.broadcast.no_buyers_found", {
                lang: this.lang,
            }));
        }
        const broadcast = await this.createBroadcast(dto, buyerId, location);
        console.log("Broadcast created:", broadcast);
        const threads = await this.createBroadcastThreads(broadcast._id.toString(), sellerIds, buyerId);
        const uniqueThreads = Array.from(new Map(threads.map((thread) => [thread._id.toString(), thread])).values());
        const threadBySellerId = new Map(uniqueThreads.map((thread) => [thread.seller.toString(), thread._id.toString()]));
        console.log("Image Urls", imageUrls);
        const initialMessages = uniqueThreads.map((thread) => ({
            broadcast: broadcast._id,
            thread: thread._id,
            sender: new mongoose_2.Types.ObjectId(buyerId),
            receiver: thread.seller,
            message: dto.message || "📢 New broadcast request",
            type: "SYSTEM",
            imageUrls,
            isRead: false,
        }));
        await this.messageModel.insertMany(initialMessages);
        const buyer = await this.userService.findUserById(buyerId);
        console.log("Buyer info for notifications:", buyer, isCategoryValid);
        const notificationPromises = sellerIds.map((sellerId) => this.notificationsService.createAndNotify(sellerId, "broadcast_created", "PROMOTION", {
            broadcastId: broadcast._id.toString(),
            threadId: threadBySellerId.get(sellerId) ?? null,
            buyerId,
            message: dto.message || "📢 New broadcast request",
            purpose: dto.purpose,
            broadcastType: dto.type,
            category: dto.categoryId,
            radius: dto.radius,
            address: dto.address,
            imageUrls: imageUrls || [],
        }, {
            broadcastType: dto.type === "product" ? "Product" : "Service",
            buyer: buyer?.name,
            categoryName: isCategoryValid?.name?.[this.lang] || "Unknown Category",
            purpose: dto.purpose,
        }));
        await Promise.allSettled(notificationPromises);
        return {
            message: this.i18n.translate("auth.broadcast.created_success", {
                lang: this.lang,
            }),
            data: {
                id: broadcast._id.toString(),
            }
        };
    }
    async sendBroadcastMessage(broadcastId, senderId, receiverId, threadId, message, imageUrl) {
        const broadcastObjectId = new mongoose_2.Types.ObjectId(broadcastId);
        const broadcast = await this.broadcastModel.findById(broadcastObjectId);
        if (!broadcast) {
            throw new common_1.NotFoundException(this.i18n.translate("auth.broadcast.broadcast_not_found", {
                lang: this.lang,
            }));
        }
        const [sender, receiver] = await Promise.all([
            this.userService.findUserById(senderId),
            this.userService.findUserById(receiverId),
        ]);
        if (!sender || !receiver) {
            throw new common_1.NotFoundException(this.i18n.translate("auth.products.user_not_found", {
                lang: this.lang,
            }));
        }
        const thread = await this.threadModel.findById(threadId);
        if (!thread) {
            throw new common_1.NotFoundException(this.i18n.translate("auth.broadcast.thread_not_found", {
                lang: this.lang,
            }));
        }
        if (thread.broadcast.toString() !== broadcastId) {
            throw new common_1.BadRequestException(this.i18n.translate("auth.broadcast.thread_invalid", {
                lang: this.lang,
            }));
        }
        const isParticipant = thread.buyer.toString() === senderId ||
            thread.seller.toString() === senderId;
        if (!isParticipant) {
            throw new common_1.BadRequestException(this.i18n.translate("auth.broadcast.sender_not_in_thread", {
                lang: this.lang,
            }));
        }
        const isValidReceiver = thread.buyer.toString() === receiverId ||
            thread.seller.toString() === receiverId;
        if (!isValidReceiver) {
            throw new common_1.BadRequestException(this.i18n.translate("auth.broadcast.receiver_invalid", {
                lang: this.lang,
            }));
        }
        const computedReceiverId = senderId === thread.buyer.toString()
            ? thread.seller.toString()
            : thread.buyer.toString();
        if (computedReceiverId === senderId) {
            throw new common_1.BadRequestException(this.i18n.translate("auth.broadcast.receiver_invalid", {
                lang: this.lang,
            }));
        }
        let actualReceiverId = computedReceiverId;
        if (receiverId !== computedReceiverId) {
            console.warn(`Broadcast.sendBroadcastMessage: overriding provided receiverId=${receiverId} with computedReceiverId=${computedReceiverId}`);
        }
        const messageResults = await this.messageModel.create({
            broadcast: broadcastObjectId,
            thread: new mongoose_2.Types.ObjectId(threadId),
            sender: new mongoose_2.Types.ObjectId(senderId),
            receiver: new mongoose_2.Types.ObjectId(actualReceiverId),
            message,
            imageUrls: imageUrl ? [imageUrl] : [],
            isRead: false,
        });
        try {
            await this.notificationsService.createAndNotify(actualReceiverId, "broadcast.new_message", "BROADCAST", {
                thread: {
                    id: thread._id,
                    buyer: thread.buyer,
                    seller: thread.seller,
                    broadcast: thread.broadcast,
                },
                message: {
                    id: messageResults._id,
                    text: messageResults.message,
                    imageUrls: messageResults.imageUrls,
                },
                sender: {
                    id: sender._id,
                    name: sender.name,
                    image: sender.image,
                },
            }, { senderName: sender.name }, sender.name);
        }
        catch (err) {
            console.error("Failed to send broadcast notification:", err);
        }
        const payload = {
            message: messageResults,
            sender,
            thread: {
                id: threadId,
                buyer: thread.buyer,
                seller: thread.seller,
                broadcast: thread.broadcast,
            },
        };
        this.broadcastGateway.emitToThreadAndUser(threadId, actualReceiverId, payload);
        return {
            data: payload,
        };
    }
    async markThreadMessagesAsRead(threadId, userId) {
        const threadObjectId = new mongoose_2.Types.ObjectId(threadId);
        const userObjectId = new mongoose_2.Types.ObjectId(userId);
        await this.messageModel
            .updateMany({
            thread: threadObjectId,
            receiver: userObjectId,
            isRead: false,
        }, { $set: { isRead: true } })
            .exec();
        return { success: true };
    }
    async getBroadcastThreads(broadcastId, currentUserId) {
        const currentUserObjectId = currentUserId
            ? new mongoose_2.Types.ObjectId(currentUserId)
            : null;
        return this.threadModel
            .aggregate([
            {
                $match: {
                    broadcast: new mongoose_2.Types.ObjectId(broadcastId),
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
                    from: "broadcastmessages",
                    let: { threadId: "$_id" },
                    pipeline: [
                        {
                            $match: {
                                $expr: { $eq: ["$thread", "$$threadId"] },
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
                                message: 1,
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
                    from: "broadcastmessages",
                    let: { threadId: "$_id", currentUserId: currentUserObjectId },
                    pipeline: [
                        {
                            $match: {
                                $expr: {
                                    $and: [
                                        { $eq: ["$thread", "$$threadId"] },
                                        { $eq: ["$receiver", "$$currentUserId"] },
                                        { $eq: ["$isRead", false] },
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
                    broadcast: 1,
                    buyer: { _id: 1, name: 1, image: 1 },
                    seller: { _id: 1, name: 1, image: 1 },
                    lastMessageAt: 1,
                    createdAt: 1,
                    updatedAt: 1,
                    latestMessage: 1,
                    unreadCount: 1,
                },
            },
            {
                $sort: { "latestMessage.createdAt": -1, createdAt: -1 },
            },
        ])
            .exec();
    }
    async getThreadMessages(threadId, userId) {
        const messages = await this.messageModel
            .find({
            thread: new mongoose_2.Types.ObjectId(threadId),
        })
            .populate("sender", "name")
            .populate("receiver", "name")
            .sort({ createdAt: 1 });
        if (userId) {
            await this.markThreadMessagesAsRead(threadId, userId);
        }
        return messages;
    }
    async getBroadcastsByBuyer(userId, page = 1, limit = 10) {
        const pageNum = Number(page);
        const limitNum = Number(limit);
        if (isNaN(pageNum) || isNaN(limitNum) || pageNum < 1 || limitNum < 1) {
            throw new common_1.BadRequestException(this.i18n.translate("common.invalid_pagination", { lang: this.lang }));
        }
        const skip = (pageNum - 1) * limitNum;
        const buyerObjectId = new mongoose_2.Types.ObjectId(userId);
        const broadcasts = await this.broadcastModel.aggregate([
            { $match: { buyer: buyerObjectId } },
            {
                $lookup: {
                    from: "broadcastthreads",
                    localField: "_id",
                    foreignField: "broadcast",
                    as: "threads",
                },
            },
            { $addFields: { threadCount: { $size: "$threads" } } },
            {
                $lookup: {
                    from: "categories",
                    localField: "category",
                    foreignField: "_id",
                    as: "category",
                },
            },
            {
                $unwind: { path: "$category", preserveNullAndEmptyArrays: true },
            },
            {
                $lookup: {
                    from: "broadcastmessages",
                    let: { broadcastId: "$_id", currentUserId: buyerObjectId },
                    pipeline: [
                        {
                            $match: {
                                $expr: {
                                    $and: [
                                        { $eq: ["$broadcast", "$$broadcastId"] },
                                        { $eq: ["$receiver", "$$currentUserId"] },
                                        { $eq: ["$isRead", false] },
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
                $lookup: {
                    from: "broadcastmessages",
                    let: { broadcastId: "$_id" },
                    pipeline: [
                        { $match: { $expr: { $eq: ["$broadcast", "$$broadcastId"] } } },
                        { $sort: { createdAt: -1 } },
                        { $limit: 1 },
                        {
                            $lookup: {
                                from: "users",
                                localField: "sender",
                                foreignField: "_id",
                                as: "sender",
                            },
                        },
                        { $unwind: { path: "$sender", preserveNullAndEmptyArrays: true } },
                        {
                            $project: {
                                message: 1,
                                createdAt: 1,
                                imageUrls: 1,
                                type: 1,
                                sender: { _id: 1, name: 1, image: 1 },
                            },
                        },
                    ],
                    as: "latestMessage",
                },
            },
            {
                $unwind: { path: "$latestMessage", preserveNullAndEmptyArrays: true },
            },
            {
                $addFields: {
                    imageUrls: {
                        $ifNull: ["$latestMessage.imageUrls", []],
                    },
                },
            },
            {
                $lookup: {
                    from: "broadcastmessages",
                    let: { broadcastId: "$_id" },
                    pipeline: [
                        {
                            $match: {
                                $expr: { $eq: ["$broadcast", "$$broadcastId"] },
                                type: "SYSTEM",
                            },
                        },
                        { $sort: { createdAt: 1 } },
                        { $limit: 1 },
                    ],
                    as: "initialMessage",
                },
            },
            {
                $unwind: { path: "$initialMessage", preserveNullAndEmptyArrays: true },
            },
            {
                $project: {
                    _id: 1,
                    broadcastCode: 1,
                    message: 1,
                    address: 1,
                    purpose: 1,
                    location: 1,
                    radius: 1,
                    type: 1,
                    createdAt: 1,
                    updatedAt: 1,
                    threadCount: 1,
                    unreadCount: 1,
                    imageUrls: 1,
                    latestMessage: 1,
                    category: 1,
                },
            },
            { $sort: { createdAt: -1 } },
            { $skip: skip },
            { $limit: limitNum },
        ]);
        const total = await this.broadcastModel.countDocuments({ buyer: buyerObjectId });
        const normalizedBroadcasts = broadcasts.map((broadcast) => ({
            ...broadcast,
            location: broadcast.location ?? null,
        }));
        return {
            meta: {
                total,
                page: pageNum,
                limit: limitNum,
                totalPages: Math.ceil(total / limitNum),
            },
            data: normalizedBroadcasts,
        };
    }
    async getBroadcastsForSeller(userId, page = 1, limit = 10) {
        const skip = (page - 1) * limit;
        const userObjectId = new mongoose_2.Types.ObjectId(userId);
        const [threads, total] = await Promise.all([
            this.threadModel
                .find({ seller: userObjectId })
                .sort({ createdAt: -1 })
                .skip(skip)
                .limit(limit)
                .select("broadcast")
                .lean()
                .exec(),
            this.threadModel.countDocuments({ seller: userObjectId }),
        ]);
        const broadcastIds = threads.map((thread) => thread.broadcast.toString());
        const uniqueBroadcastIds = Array.from(new Set(broadcastIds));
        const threadMap = new Map(threads.map((thread) => [
            thread.broadcast.toString(),
            thread._id.toString(),
        ]));
        const threadIds = threads.map((thread) => new mongoose_2.Types.ObjectId(String(thread._id)));
        const unreadCounts = await this.messageModel
            .aggregate([
            {
                $match: {
                    thread: { $in: threadIds },
                    receiver: userObjectId,
                    isRead: false,
                    sender: { $ne: userObjectId },
                },
            },
            {
                $group: {
                    _id: "$thread",
                    unreadCount: { $sum: 1 },
                },
            },
        ])
            .exec();
        const unreadMap = new Map();
        unreadCounts.forEach((item) => {
            const threadId = String(item?._id ?? "");
            if (threadId) {
                unreadMap.set(threadId, Number(item.unreadCount || 0));
            }
        });
        const data = await this.broadcastModel
            .find({ _id: { $in: uniqueBroadcastIds } })
            .populate("category")
            .exec();
        const broadcastIdOrder = threads.map((thread) => thread.broadcast.toString());
        const dataMap = new Map(data.map((b) => [b._id.toString(), b]));
        const orderedData = broadcastIdOrder
            .map((id) => dataMap.get(id))
            .filter((b) => b != null)
            .map((broadcast) => {
            const threadId = threadMap.get(broadcast._id.toString());
            return {
                ...broadcast.toObject?.() ?? broadcast,
                location: broadcast.location ?? null,
                threadId,
                unreadCount: threadId ? unreadMap.get(threadId) ?? 0 : 0,
            };
        });
        return {
            meta: {
                total,
                page,
                limit,
                totalPages: Math.ceil(total / limit),
            },
            data: orderedData,
        };
    }
    async getAllBroadcastsForAdmin(page = 1, limit = 10, search, status, startDate, endDate) {
        const pageNum = Number(page) || 1;
        const limitNum = Number(limit) || 10;
        const skip = (pageNum - 1) * limitNum;
        const dateMatchStage = { isDeleted: { $ne: true } };
        if (startDate || endDate) {
            dateMatchStage.createdAt = {};
            if (startDate) {
                dateMatchStage.createdAt.$gte = new Date(startDate);
            }
            if (endDate) {
                const endOfDay = new Date(endDate);
                endOfDay.setHours(23, 59, 59, 999);
                dateMatchStage.createdAt.$lte = endOfDay;
            }
        }
        const pipeline = [
            { $match: dateMatchStage },
            {
                $lookup: {
                    from: "users",
                    localField: "buyer",
                    foreignField: "_id",
                    as: "buyerInfo",
                },
            },
            { $unwind: { path: "$buyerInfo", preserveNullAndEmptyArrays: true } },
            {
                $lookup: {
                    from: "broadcastthreads",
                    localField: "_id",
                    foreignField: "broadcast",
                    as: "threads",
                },
            },
            {
                $lookup: {
                    from: "broadcastmessages",
                    let: { broadcastId: "$_id", buyerId: "$buyer" },
                    pipeline: [
                        {
                            $match: {
                                $expr: {
                                    $and: [
                                        { $eq: ["$broadcast", "$$broadcastId"] },
                                        { $ne: ["$sender", "$$buyerId"] },
                                    ],
                                },
                            },
                        },
                    ],
                    as: "sellerMessages",
                },
            },
            {
                $addFields: {
                    sentTo: { $size: "$threads" },
                    repliedSellers: {
                        $size: { $setUnion: ["$sellerMessages.sender", []] },
                    },
                },
            },
        ];
        const matchStage = {};
        if (status?.trim()) {
            matchStage.status = status.trim().toLowerCase();
        }
        if (search?.trim()) {
            const regex = { $regex: search.trim(), $options: "i" };
            matchStage.$or = [{ message: regex }, { "buyerInfo.name": regex }];
        }
        if (Object.keys(matchStage).length > 0) {
            pipeline.push({ $match: matchStage });
        }
        pipeline.push({ $sort: { createdAt: -1 } }, {
            $project: {
                broadcastCode: 1,
                message: 1,
                purpose: 1,
                type: 1,
                status: 1,
                createdAt: 1,
                sentTo: 1,
                repliedSellers: 1,
                "buyerInfo._id": 1,
                "buyerInfo.name": 1,
            },
        }, {
            $facet: {
                data: [{ $skip: skip }, { $limit: limitNum }],
                totalCount: [{ $count: "count" }],
            },
        });
        const result = await this.broadcastModel.aggregate(pipeline).exec();
        const data = result[0]?.data ?? [];
        const total = result[0]?.totalCount?.[0]?.count ?? 0;
        return {
            data,
            meta: {
                total,
                page: pageNum,
                limit: limitNum,
                totalPages: Math.ceil(total / limitNum),
            },
        };
    }
    async getBroadcastDetailForAdmin(broadcastId) {
        if (!mongoose_2.Types.ObjectId.isValid(broadcastId)) {
            throw new common_1.BadRequestException("Invalid broadcast id");
        }
        const broadcastObjectId = new mongoose_2.Types.ObjectId(broadcastId);
        const broadcast = await this.broadcastModel
            .findOne({ _id: broadcastObjectId, isDeleted: { $ne: true } })
            .populate("buyer", "name email phone image")
            .populate("category")
            .lean();
        if (!broadcast) {
            throw new common_1.NotFoundException("Broadcast not found");
        }
        const [threadCount, repliedSellers, initialMessage] = await Promise.all([
            this.threadModel.countDocuments({ broadcast: broadcastObjectId }),
            this.messageModel.distinct("sender", {
                broadcast: broadcastObjectId,
                sender: { $ne: broadcast.buyer?._id },
            }),
            this.messageModel
                .findOne({ broadcast: broadcastObjectId, type: "SYSTEM" })
                .sort({ createdAt: 1 })
                .lean(),
        ]);
        return {
            data: {
                ...broadcast,
                sentTo: threadCount,
                repliedSellers: repliedSellers.length,
                imageUrls: initialMessage?.imageUrls ?? [],
            },
        };
    }
    async getBroadcastRecipients(broadcastId) {
        if (!mongoose_2.Types.ObjectId.isValid(broadcastId)) {
            throw new common_1.BadRequestException("Invalid broadcast id");
        }
        const broadcastExists = await this.broadcastModel.exists({
            _id: broadcastId,
            isDeleted: { $ne: true },
        });
        if (!broadcastExists) {
            throw new common_1.NotFoundException("Broadcast not found");
        }
        const recipients = await this.threadModel.aggregate([
            { $match: { broadcast: new mongoose_2.Types.ObjectId(broadcastId) } },
            {
                $lookup: {
                    from: "users",
                    localField: "seller",
                    foreignField: "_id",
                    as: "sellerInfo",
                },
            },
            { $unwind: { path: "$sellerInfo", preserveNullAndEmptyArrays: true } },
            {
                $lookup: {
                    from: "broadcastmessages",
                    let: { threadId: "$_id", sellerId: "$seller" },
                    pipeline: [
                        {
                            $match: {
                                $expr: {
                                    $and: [
                                        { $eq: ["$thread", "$$threadId"] },
                                        { $eq: ["$sender", "$$sellerId"] },
                                    ],
                                },
                            },
                        },
                        { $sort: { createdAt: 1 } },
                        { $limit: 1 },
                        { $project: { createdAt: 1 } },
                    ],
                    as: "firstReply",
                },
            },
            {
                $addFields: {
                    hasReplied: { $gt: [{ $size: "$firstReply" }, 0] },
                    repliedAt: { $arrayElemAt: ["$firstReply.createdAt", 0] },
                },
            },
            {
                $project: {
                    sellerId: "$sellerInfo._id",
                    name: "$sellerInfo.name",
                    email: "$sellerInfo.email",
                    image: "$sellerInfo.image",
                    phone: "$sellerInfo.phone",
                    sentAt: "$createdAt",
                    hasReplied: 1,
                    repliedAt: 1,
                },
            },
            { $sort: { sentAt: -1 } },
        ]);
        return {
            data: recipients,
            meta: { total: recipients.length },
        };
    }
    async getAdminThreadMessages(broadcastId, sellerId, paginationDto) {
        if (!mongoose_2.Types.ObjectId.isValid(broadcastId) || !mongoose_2.Types.ObjectId.isValid(sellerId)) {
            throw new common_1.BadRequestException("Invalid broadcast or seller id");
        }
        const { page = 1, limit = 10 } = paginationDto;
        const thread = await this.threadModel.findOne({
            broadcast: new mongoose_2.Types.ObjectId(broadcastId),
            seller: new mongoose_2.Types.ObjectId(sellerId),
        });
        if (!thread) {
            return {
                thread: null,
                messages: [],
                meta: { total: 0, page, limit, totalPages: 0 },
            };
        }
        const skip = (page - 1) * limit;
        const [data, total] = await Promise.all([
            this.messageModel
                .find({ thread: thread._id })
                .sort({ createdAt: -1 })
                .skip(skip)
                .limit(limit),
            this.messageModel.countDocuments({ thread: thread._id }),
        ]);
        return {
            thread: { _id: thread._id },
            messages: data,
            meta: { total, page, limit, totalPages: Math.ceil(total / limit) },
        };
    }
    async closeBroadcast(broadcastId) {
        if (!mongoose_2.Types.ObjectId.isValid(broadcastId)) {
            throw new common_1.BadRequestException("Invalid broadcast id");
        }
        const broadcast = await this.broadcastModel.findByIdAndUpdate(broadcastId, { $set: { status: "closed" } }, { new: true });
        if (!broadcast) {
            throw new common_1.NotFoundException("Broadcast not found");
        }
        return { message: "Broadcast closed successfully", data: broadcast };
    }
    async deleteBroadcast(broadcastId) {
        if (!mongoose_2.Types.ObjectId.isValid(broadcastId)) {
            throw new common_1.BadRequestException("Invalid broadcast id");
        }
        const broadcast = await this.broadcastModel.findByIdAndUpdate(broadcastId, { $set: { isDeleted: true } }, { new: true });
        if (!broadcast) {
            throw new common_1.NotFoundException("Broadcast not found");
        }
        return { message: "Broadcast deleted successfully", data: broadcast };
    }
};
exports.BroadcastService = BroadcastService;
exports.BroadcastService = BroadcastService = __decorate([
    (0, common_1.Injectable)(),
    __param(0, (0, mongoose_1.InjectModel)(broadcast_schema_1.Broadcast.name)),
    __param(1, (0, mongoose_1.InjectModel)(broadcast_message_schema_1.BroadcastMessage.name)),
    __param(2, (0, mongoose_1.InjectModel)(broadcast_thread_schema_1.BroadcastThread.name)),
    __param(3, (0, mongoose_1.InjectModel)(counter_schema_1.Counter.name)),
    __metadata("design:paramtypes", [mongoose_2.Model,
        mongoose_2.Model,
        mongoose_2.Model,
        mongoose_2.Model,
        shop_service_1.ShopService,
        category_service_1.CategoryService,
        users_service_1.UsersService,
        services_service_1.ServicesService,
        products_service_1.ProductsService,
        notifications_service_1.NotificationsService,
        nestjs_i18n_1.I18nService,
        nestjs_cls_1.ClsService,
        broadcast_gateway_1.BroadcastGateway])
], BroadcastService);
//# sourceMappingURL=broadcast.service.js.map