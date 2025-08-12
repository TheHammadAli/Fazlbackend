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
const order_schema_1 = require("./schema/order.schema");
const users_service_1 = require("../users/users.service");
const products_service_1 = require("../products/products.service");
const shop_service_1 = require("../shop/shop.service");
let OrdersService = class OrdersService {
    orderModel;
    usersService;
    productsService;
    shopService;
    constructor(orderModel, usersService, productsService, shopService) {
        this.orderModel = orderModel;
        this.usersService = usersService;
        this.productsService = productsService;
        this.shopService = shopService;
    }
    async createOrder(dto) {
        const buyer = await this.usersService.findUserById(dto.buyer);
        if (!buyer)
            throw new common_1.NotFoundException('Buyer not found');
        console.log("DTO:", dto);
        const product = await this.productsService.getById(dto.product);
        if (!product)
            throw new common_1.NotFoundException('Product not found');
        console.log("Product:", product);
        let ownerExists = false;
        if (dto.ownerModel === 'Shop') {
            ownerExists = !!(await this.shopService.getShopById(dto.owner));
        }
        else if (dto.ownerModel === 'User') {
            ownerExists = !!(await this.usersService.findUserById(dto.owner));
        }
        if (!ownerExists)
            throw new common_1.NotFoundException('Order owner not found');
        let isValidOwner = false;
        if (dto.ownerModel === 'Shop') {
            isValidOwner = dto.owner === product.shopId.toString();
        }
        if (dto.ownerModel === 'User') {
            isValidOwner = dto.owner === product.ownerId?.toString();
        }
        if (!isValidOwner) {
            throw new common_1.BadRequestException('Order owner does not match product owner');
        }
        const order = new this.orderModel({
            ...dto,
            buyer: new mongoose_2.Types.ObjectId(dto.buyer),
            owner: new mongoose_2.Types.ObjectId(dto.owner),
            product: new mongoose_2.Types.ObjectId(dto.product),
        });
        return order.save();
    }
    async getOrderById(orderId) {
        if (!mongoose_2.Types.ObjectId.isValid(orderId))
            throw new common_1.BadRequestException('Invalid order ID');
        const order = await this.orderModel.findById(orderId);
        if (!order)
            throw new common_1.NotFoundException('Order not found');
        return order;
    }
    async getOrdersByOwner(ownerId, ownerModel, page = 1, limit = 10) {
        if (!mongoose_2.Types.ObjectId.isValid(ownerId))
            throw new common_1.BadRequestException('Invalid owner ID');
        if (page < 1 || limit < 1)
            throw new common_1.BadRequestException('Page and limit must be greater than 0');
        if (ownerModel === 'Shop') {
            const shop = await this.shopService.getShopById(ownerId);
            if (!shop)
                throw new common_1.NotFoundException('Shop owner not found');
        }
        else if (ownerModel === 'User') {
            const user = await this.usersService.findUserById(ownerId);
            if (!user)
                throw new common_1.NotFoundException('User owner not found');
        }
        else {
            throw new common_1.BadRequestException('Invalid ownerModel');
        }
        const skip = (page - 1) * limit;
        const [data, total] = await Promise.all([
            this.orderModel
                .find({ owner: new mongoose_2.Types.ObjectId(ownerId), ownerModel })
                .sort({ createdAt: -1 })
                .skip(skip)
                .limit(limit)
                .exec(),
            this.orderModel.countDocuments({ owner: new mongoose_2.Types.ObjectId(ownerId), ownerModel }),
        ]);
        return {
            data,
            total,
            page,
            limit,
            totalPages: Math.ceil(total / limit),
        };
    }
    async getOrdersByBuyer(buyerId, page = 1, limit = 10) {
        if (!mongoose_2.Types.ObjectId.isValid(buyerId))
            throw new common_1.BadRequestException('Invalid buyer ID');
        if (page < 1 || limit < 1)
            throw new common_1.BadRequestException('Page and limit must be greater than 0');
        const buyer = await this.usersService.findUserById(buyerId);
        if (!buyer)
            throw new common_1.NotFoundException('Buyer not found');
        const skip = (page - 1) * limit;
        const [data, total] = await Promise.all([
            this.orderModel
                .find({ buyer: new mongoose_2.Types.ObjectId(buyerId) })
                .sort({ createdAt: -1 })
                .skip(skip)
                .limit(limit)
                .exec(),
            this.orderModel.countDocuments({ buyer: new mongoose_2.Types.ObjectId(buyerId) }),
        ]);
        return {
            data,
            total,
            page,
            limit,
            totalPages: Math.ceil(total / limit),
        };
    }
    async updateOrder(orderId, dto) {
        if (!mongoose_2.Types.ObjectId.isValid(orderId))
            throw new common_1.BadRequestException('Invalid order ID');
        const updated = await this.orderModel.findByIdAndUpdate(orderId, dto, { new: true });
        if (!updated)
            throw new common_1.NotFoundException('Order not found');
        return updated;
    }
    async deleteOrder(orderId) {
        if (!mongoose_2.Types.ObjectId.isValid(orderId))
            throw new common_1.BadRequestException('Invalid order ID');
        const result = await this.orderModel.findByIdAndDelete(orderId);
        if (!result)
            throw new common_1.NotFoundException('Order not found');
    }
};
exports.OrdersService = OrdersService;
exports.OrdersService = OrdersService = __decorate([
    (0, common_1.Injectable)(),
    __param(0, (0, mongoose_1.InjectModel)(order_schema_1.Order.name)),
    __metadata("design:paramtypes", [mongoose_2.Model,
        users_service_1.UsersService,
        products_service_1.ProductsService,
        shop_service_1.ShopService])
], OrdersService);
//# sourceMappingURL=orders.service.js.map