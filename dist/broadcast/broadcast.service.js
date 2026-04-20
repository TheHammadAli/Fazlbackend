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
const broadcast_schema_1 = require("./schema/broadcast.schema");
const broadcast_message_schema_1 = require("./schema/broadcast-message.schema");
const broadcast_thread_schema_1 = require("./schema/broadcast-thread.schema");
const shop_service_1 = require("../shop/shop.service");
const users_service_1 = require("../users/users.service");
const category_service_1 = require("../category/category.service");
let BroadcastService = class BroadcastService {
    broadcastModel;
    messageModel;
    threadModel;
    shopService;
    categoryService;
    userService;
    constructor(broadcastModel, messageModel, threadModel, shopService, categoryService, userService) {
        this.broadcastModel = broadcastModel;
        this.messageModel = messageModel;
        this.threadModel = threadModel;
        this.shopService = shopService;
        this.categoryService = categoryService;
        this.userService = userService;
    }
    async createBroadcast(dto, buyerId, location) {
        return this.broadcastModel.create({
            buyer: new mongoose_2.Types.ObjectId(buyerId),
            message: dto.message,
            radius: dto.radius,
            category: new mongoose_2.Types.ObjectId(dto.categoryId),
            location,
        });
    }
    async findNearbySellers(location, radiusKm) {
        const radiusMeters = radiusKm * 1000;
        const shops = await this.shopService.findShopsNearLocation(location.coordinates, radiusMeters);
        return shops.map((s) => s.ownerId.toString());
    }
    async findCategorybyId(categoryId) {
        return this.categoryService.findById(categoryId);
    }
    async createBroadcastThreads(broadcastId, sellerIds, buyerId) {
        const threads = sellerIds.map((sellerId) => ({
            broadcast: new mongoose_2.Types.ObjectId(broadcastId),
            buyer: new mongoose_2.Types.ObjectId(buyerId),
            seller: new mongoose_2.Types.ObjectId(sellerId),
        }));
        return this.threadModel.insertMany(threads);
    }
    async createBroadcastAndDispatch(dto, buyerId, location) {
        const isCategoryValid = await this.findCategorybyId(dto.categoryId);
        if (!isCategoryValid) {
            throw new common_1.BadRequestException("Category Invalid");
        }
        let sellerIds = await this.findNearbySellers(location, dto.radius);
        sellerIds = sellerIds.filter((ids) => ids.toString() !== buyerId.toString());
        if (!sellerIds.length) {
            throw new common_1.BadRequestException("No sellers found in given radius");
        }
        const broadcast = await this.createBroadcast(dto, buyerId, location);
        const threads = await this.createBroadcastThreads(broadcast._id.toString(), sellerIds, buyerId);
        const initialMessages = threads.map((thread) => ({
            broadcast: broadcast._id,
            thread: thread._id,
            sender: new mongoose_2.Types.ObjectId(buyerId),
            receiver: thread.seller,
            message: dto.message || "📢 New broadcast request",
            type: "SYSTEM",
        }));
        await this.messageModel.insertMany(initialMessages);
        return {
            message: "Broadcast created and dispatched successfully",
            data: broadcast._id.toString(),
        };
    }
    async sendBroadcastMessage(broadcastId, senderId, receiverId, threadId, message) {
        const broadcastObjectId = new mongoose_2.Types.ObjectId(broadcastId);
        const broadcast = await this.broadcastModel.findById(broadcastObjectId);
        if (!broadcast) {
            throw new common_1.NotFoundException("Broadcast not found");
        }
        const [sender, receiver] = await Promise.all([
            this.userService.findUserById(senderId),
            this.userService.findUserById(receiverId),
        ]);
        if (!sender || !receiver) {
            throw new common_1.NotFoundException("User not found");
        }
        const thread = await this.threadModel.findById(threadId);
        if (!thread) {
            throw new common_1.NotFoundException("Thread not found");
        }
        if (thread.broadcast.toString() !== broadcastId) {
            throw new common_1.BadRequestException("Thread does not belong to broadcast");
        }
        const isParticipant = thread.buyer.toString() === senderId ||
            thread.seller.toString() === senderId;
        if (!isParticipant) {
            throw new common_1.BadRequestException("Sender not part of thread");
        }
        const isValidReceiver = thread.buyer.toString() === receiverId ||
            thread.seller.toString() === receiverId;
        if (!isValidReceiver) {
            throw new common_1.BadRequestException("Invalid receiver for thread");
        }
        return this.messageModel.create({
            broadcast: broadcastObjectId,
            thread: new mongoose_2.Types.ObjectId(threadId),
            sender: new mongoose_2.Types.ObjectId(senderId),
            receiver: new mongoose_2.Types.ObjectId(receiverId),
            message,
        });
    }
    async getBroadcastThreads(broadcastId) {
        return this.threadModel
            .find({
            broadcast: new mongoose_2.Types.ObjectId(broadcastId),
        })
            .populate("buyer", "name")
            .populate("seller", "name")
            .sort({ createdAt: -1 });
    }
    async getThreadMessages(threadId) {
        return this.messageModel
            .find({
            thread: new mongoose_2.Types.ObjectId(threadId),
        })
            .populate("sender", "name")
            .populate("receiver", "name")
            .sort({ createdAt: 1 });
    }
    async getBroadcastsByBuyer(userId, page = 1, limit = 10) {
        const skip = (page - 1) * limit;
        const filter = { buyer: new mongoose_2.Types.ObjectId(userId) };
        const [data, total] = await Promise.all([
            this.broadcastModel
                .find(filter)
                .populate("category", "name")
                .sort({ createdAt: -1 })
                .skip(skip)
                .limit(limit)
                .exec(),
            this.broadcastModel.countDocuments(filter),
        ]);
        return {
            meta: {
                total,
                page,
                limit,
                totalPages: Math.ceil(total / limit),
            },
            data,
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
                .exec(),
            this.threadModel.countDocuments({ seller: userObjectId }),
        ]);
        const broadcastIds = threads.map((thread) => thread.broadcast);
        const data = await this.broadcastModel
            .find({ _id: { $in: broadcastIds } })
            .populate("category", "name")
            .sort({ createdAt: -1 })
            .exec();
        return {
            meta: {
                total,
                page,
                limit,
                totalPages: Math.ceil(total / limit),
            },
            data,
        };
    }
};
exports.BroadcastService = BroadcastService;
exports.BroadcastService = BroadcastService = __decorate([
    (0, common_1.Injectable)(),
    __param(0, (0, mongoose_1.InjectModel)(broadcast_schema_1.Broadcast.name)),
    __param(1, (0, mongoose_1.InjectModel)(broadcast_message_schema_1.BroadcastMessage.name)),
    __param(2, (0, mongoose_1.InjectModel)(broadcast_thread_schema_1.BroadcastThread.name)),
    __metadata("design:paramtypes", [mongoose_2.Model,
        mongoose_2.Model,
        mongoose_2.Model,
        shop_service_1.ShopService,
        category_service_1.CategoryService,
        users_service_1.UsersService])
], BroadcastService);
//# sourceMappingURL=broadcast.service.js.map