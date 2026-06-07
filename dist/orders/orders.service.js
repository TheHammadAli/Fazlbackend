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
exports.OrdersService = void 0;
const common_1 = require("@nestjs/common");
const mongoose_1 = require("@nestjs/mongoose");
const mongoose_2 = require("mongoose");
const nestjs_i18n_1 = require("nestjs-i18n");
const order_schema_1 = require("./schema/order.schema");
const users_service_1 = require("../users/users.service");
const products_service_1 = require("../products/products.service");
const shop_service_1 = require("../shop/shop.service");
const notifications_service_1 = require("../notifications/notifications.service");
const nestjs_cls_1 = require("nestjs-cls");
let OrdersService = class OrdersService {
    orderModel;
    usersService;
    productsService;
    shopService;
    notificationsService;
    i18n;
    cls;
    constructor(orderModel, usersService, productsService, shopService, notificationsService, i18n, cls) {
        this.orderModel = orderModel;
        this.usersService = usersService;
        this.productsService = productsService;
        this.shopService = shopService;
        this.notificationsService = notificationsService;
        this.i18n = i18n;
        this.cls = cls;
    }
    constants = {
        orders: {
            placed: "placed",
            confirmed: "confirmed",
            shipped: "shipped",
            delivered: "delivered",
            cancelled: "cancelled",
            received: "received",
        },
    };
    get lang() {
        return this.cls.get("lang") || "en";
    }
    async createMultipleOrders(dto) {
        const createdOrders = [];
        const results = Promise.all(dto.map(async (orderDto) => {
            try {
                createdOrders.push(this.createOrder(orderDto));
            }
            catch (error) {
                console.error(`Failed to create order for product ${orderDto.product}:`, error);
            }
        }));
        const promiseResults = await results;
        console.log("Bulk order creation results:", promiseResults);
        return {
            message: this.i18n.translate("auth.orders.created_success", { lang: this.lang }),
            data: promiseResults,
        };
    }
    async createOrder(dto) {
        const buyer = await this.usersService.findUserById(dto.buyer);
        if (!buyer)
            throw new common_1.NotFoundException(this.i18n.translate("auth.orders.buyer_not_found", { lang: this.lang }));
        const product = await this.productsService.getById(dto.product);
        if (!product)
            throw new common_1.NotFoundException(this.i18n.translate("auth.orders.product_not_found", {
                lang: this.lang,
            }));
        let ownerExists = false;
        let owner = null;
        if (dto.ownerModel === "Shop") {
            owner = await this.shopService.getShopById(dto.owner);
        }
        else if (dto.ownerModel === "User") {
            owner = await this.usersService.findUserById(dto.owner);
        }
        ownerExists = !!owner;
        if (!ownerExists)
            throw new common_1.NotFoundException(this.i18n.translate("auth.orders.order_owner_not_found", {
                lang: this.lang,
            }));
        console.log("Owner found:", owner, dto.owner, product);
        let isValidOwner = false;
        if (dto.ownerModel === "Shop") {
            isValidOwner = dto.owner === product.shopId._id.toString();
        }
        else if (dto.ownerModel === "User") {
            isValidOwner = dto.owner === product.ownerId?._id?.toString();
        }
        if (!isValidOwner) {
            throw new common_1.BadRequestException(this.i18n.translate("auth.orders.order_mismatch", { lang: this.lang }));
        }
        const order = new this.orderModel({
            ...dto,
            buyer: new mongoose_2.Types.ObjectId(dto.buyer),
            owner: new mongoose_2.Types.ObjectId(dto.owner),
            product: new mongoose_2.Types.ObjectId(dto.product),
        });
        const savedOrder = await order.save();
        const notificationPayload = {
            orderId: savedOrder._id.toString(),
            productId: dto.product,
            ownerModel: dto.ownerModel,
            actionType: this.constants.orders.placed,
        };
        console.log("Product.Ownerid", product.ownerId);
        this.notificationsService.createAndNotify(dto.buyer, "order_created_buyer", "ORDER", notificationPayload, { productTitle: product.title });
        console.log("Owner for notification:", owner);
        this.notificationsService.createAndNotify(dto.ownerModel === "Shop"
            ? owner.ownerId._id?.toString()
            : owner._id?.toString() || dto.owner, "order_created_seller", "ORDER", { ...notificationPayload, actionType: this.constants.orders.received }, { productTitle: product.title });
        return { message: this.i18n.translate("auth.orders.created_success", { lang: this.lang }), data: savedOrder };
    }
    async getOrderById(orderId) {
        if (!mongoose_2.Types.ObjectId.isValid(orderId))
            throw new common_1.BadRequestException(this.i18n.translate("auth.orders.invalid_order_id", {
                lang: this.lang,
            }));
        const order = await this.orderModel
            .findById(orderId)
            .populate("buyer")
            .populate("product")
            .populate("owner")
            .exec();
        if (!order)
            throw new common_1.NotFoundException(this.i18n.translate("auth.orders.order_not_found", { lang: this.lang }));
        return order;
    }
    async getOrdersByOwner(ownerId, ownerModel, page = 1, limit = 10, status) {
        if (!mongoose_2.Types.ObjectId.isValid(ownerId))
            throw new common_1.BadRequestException(this.i18n.translate("auth.orders.invalid_owner_id", {
                lang: this.lang,
            }));
        if (page < 1 || limit < 1)
            throw new common_1.BadRequestException(this.i18n.translate("auth.orders.invalid_page_limit", {
                lang: this.lang,
            }));
        const skip = (page - 1) * limit;
        const filter = {
            owner: new mongoose_2.Types.ObjectId(ownerId),
            ownerModel,
        };
        if (status) {
            filter.status = status;
        }
        const [data, total] = await Promise.all([
            this.orderModel
                .find(filter)
                .populate("product")
                .sort({ createdAt: -1 })
                .skip(skip)
                .limit(limit)
                .exec(),
            this.orderModel.countDocuments(filter),
        ]);
        console.log("Data, Total, Filter", { data, total, filter });
        return {
            data,
            meta: {
                total,
                page,
                limit,
                totalPages: Math.ceil(total / limit)
            }
        };
    }
    async getOrdersByBuyer(buyerId, page = 1, limit = 10, status) {
        if (!mongoose_2.Types.ObjectId.isValid(buyerId))
            throw new common_1.BadRequestException(this.i18n.translate("auth.orders.invalid_buyer_id", {
                lang: this.lang,
            }));
        const filter = {
            buyer: new mongoose_2.Types.ObjectId(buyerId),
        };
        if (status) {
            filter.status = status;
        }
        const skip = (page - 1) * limit;
        const [data, total] = await Promise.all([
            this.orderModel
                .find(filter)
                .populate("product")
                .populate("owner")
                .sort({ createdAt: -1 })
                .skip(skip)
                .limit(limit)
                .exec(),
            this.orderModel.countDocuments(filter),
        ]);
        return {
            data,
            meta: {
                total,
                page,
                limit,
                totalPages: Math.ceil(total / limit)
            }
        };
    }
    async updateOrder(orderId, dto) {
        if (!mongoose_2.Types.ObjectId.isValid(orderId))
            throw new common_1.BadRequestException(this.i18n.translate("auth.orders.invalid_order_id", {
                lang: this.lang,
            }));
        const updated = await this.orderModel
            .findByIdAndUpdate(orderId, dto, { new: true })
            .populate("product");
        if (!updated)
            throw new common_1.NotFoundException(this.i18n.translate("auth.orders.order_not_found", { lang: this.lang }));
        if (dto.status) {
            const orderId = updated._id instanceof mongoose_2.Types.ObjectId
                ? updated._id.toHexString()
                : String(updated._id);
            const productTitle = updated.product?.title || "Product";
            this.notificationsService.createAndNotify(updated.buyer.toString(), "order_status_updated", "ORDER", {
                orderId: orderId,
                status: dto.status,
                productId: updated.product._id.toString(),
                actionType: updated.status,
            }, {
                productTitle: productTitle,
                status: dto.status,
            });
        }
        return updated;
    }
    async deleteOrder(orderId) {
        if (!mongoose_2.Types.ObjectId.isValid(orderId))
            throw new common_1.BadRequestException(this.i18n.translate("auth.orders.invalid_order_id", {
                lang: this.lang,
            }));
        const result = await this.orderModel.findByIdAndDelete(orderId);
        if (!result)
            throw new common_1.NotFoundException(this.i18n.translate("auth.orders.order_not_found", { lang: this.lang }));
    }
};
exports.OrdersService = OrdersService;
exports.OrdersService = OrdersService = __decorate([
    (0, common_1.Injectable)(),
    __param(0, (0, mongoose_1.InjectModel)(order_schema_1.Order.name)),
    __param(1, (0, common_1.Inject)((0, common_1.forwardRef)(() => users_service_1.UsersService))),
    __param(2, (0, common_1.Inject)((0, common_1.forwardRef)(() => products_service_1.ProductsService))),
    __param(3, (0, common_1.Inject)((0, common_1.forwardRef)(() => shop_service_1.ShopService))),
    __param(4, (0, common_1.Inject)((0, common_1.forwardRef)(() => notifications_service_1.NotificationsService))),
    __metadata("design:paramtypes", [mongoose_2.Model,
        users_service_1.UsersService,
        products_service_1.ProductsService,
        shop_service_1.ShopService,
        notifications_service_1.NotificationsService,
        nestjs_i18n_1.I18nService,
        nestjs_cls_1.ClsService])
], OrdersService);
//# sourceMappingURL=orders.service.js.map