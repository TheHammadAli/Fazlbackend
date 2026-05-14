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
exports.OrdersController = void 0;
const common_1 = require("@nestjs/common");
const swagger_1 = require("@nestjs/swagger");
const orders_service_1 = require("./orders.service");
const create_order_dto_1 = require("./dto/create-order-dto");
const update_order_dto_1 = require("./dto/update-order-dto");
const order_schema_1 = require("./schema/order.schema");
const jwt_auth_guard_1 = require("../auth/guard/jwt-auth-guard");
const pagination_dto_1 = require("../common/dto/pagination.dto");
let OrdersController = class OrdersController {
    ordersService;
    constructor(ordersService) {
        this.ordersService = ordersService;
    }
    async createOrder(dto) {
        return this.ordersService.createOrder(dto);
    }
    async createMultipleOrders(dto) {
        return this.ordersService.createMultipleOrders(dto);
    }
    async getOrderById(id) {
        return this.ordersService.getOrderById(id);
    }
    async getOrdersByOwner(ownerId, ownerModel, pagination, status) {
        const results = await this.ordersService.getOrdersByOwner(ownerId, ownerModel, pagination.page, pagination.limit, status);
        console.log("getOrdersByOwner results", results);
        return results;
    }
    async getOrdersByBuyer(buyerId, pagination, status) {
        return this.ordersService.getOrdersByBuyer(buyerId, pagination.page, pagination.limit, status);
    }
    async updateOrder(id, dto) {
        return this.ordersService.updateOrder(id, dto);
    }
    async deleteOrder(id) {
        return this.ordersService.deleteOrder(id);
    }
};
exports.OrdersController = OrdersController;
__decorate([
    (0, common_1.Post)(),
    (0, swagger_1.ApiOperation)({ summary: "Create a new order" }),
    (0, swagger_1.ApiResponse)({ status: 201, description: "Order created", type: order_schema_1.Order }),
    __param(0, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [create_order_dto_1.CreateOrderDto]),
    __metadata("design:returntype", Promise)
], OrdersController.prototype, "createOrder", null);
__decorate([
    (0, common_1.Post)("bulk/create"),
    (0, swagger_1.ApiOperation)({ summary: "Create multiple orders" }),
    (0, swagger_1.ApiBody)({
        type: create_order_dto_1.CreateOrderDto,
        isArray: true,
    }),
    (0, swagger_1.ApiResponse)({ status: 201, description: "Orders created", type: [order_schema_1.Order] }),
    __param(0, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Array]),
    __metadata("design:returntype", Promise)
], OrdersController.prototype, "createMultipleOrders", null);
__decorate([
    (0, common_1.Get)(":id"),
    (0, swagger_1.ApiOperation)({ summary: "Get order by ID" }),
    (0, swagger_1.ApiParam)({ name: "id", description: "Order ID" }),
    (0, swagger_1.ApiResponse)({ status: 200, description: "Order found", type: order_schema_1.Order }),
    __param(0, (0, common_1.Param)("id")),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", Promise)
], OrdersController.prototype, "getOrderById", null);
__decorate([
    (0, common_1.Get)("owner/:ownerId"),
    (0, swagger_1.ApiOperation)({ summary: "Get paginated orders by owner (Shop or User)" }),
    (0, swagger_1.ApiParam)({ name: "ownerId", description: "Owner ID (Shop or User)" }),
    (0, swagger_1.ApiQuery)({ name: "ownerModel", enum: ["Shop", "User"], required: true }),
    (0, swagger_1.ApiQuery)({ name: "page", required: false, type: Number }),
    (0, swagger_1.ApiQuery)({ name: "status", required: false, type: String }),
    (0, swagger_1.ApiQuery)({ name: "limit", required: false, type: Number }),
    (0, swagger_1.ApiResponse)({
        status: 200,
        description: "Paginated orders found",
        schema: {
            example: {
                data: [],
                total: 0,
                page: 1,
                limit: 10,
                totalPages: 0,
            },
        },
    }),
    __param(0, (0, common_1.Param)("ownerId")),
    __param(1, (0, common_1.Query)("ownerModel")),
    __param(2, (0, common_1.Query)()),
    __param(3, (0, common_1.Query)("status")),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String, pagination_dto_1.PaginationDto, String]),
    __metadata("design:returntype", Promise)
], OrdersController.prototype, "getOrdersByOwner", null);
__decorate([
    (0, common_1.Get)("buyer/:buyerId"),
    (0, swagger_1.ApiOperation)({ summary: "Get paginated orders by buyer" }),
    (0, swagger_1.ApiParam)({ name: "buyerId", description: "Buyer User ID" }),
    (0, swagger_1.ApiQuery)({ name: "page", required: false, type: Number }),
    (0, swagger_1.ApiQuery)({ name: "limit", required: false, type: Number }),
    (0, swagger_1.ApiQuery)({ name: "status", required: false, type: String }),
    (0, swagger_1.ApiResponse)({
        status: 200,
        description: "Paginated orders found",
        schema: {
            example: {
                data: [],
                total: 0,
                page: 1,
                limit: 10,
                totalPages: 0,
            },
        },
    }),
    __param(0, (0, common_1.Param)("buyerId")),
    __param(1, (0, common_1.Query)()),
    __param(2, (0, common_1.Query)("status")),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, pagination_dto_1.PaginationDto, String]),
    __metadata("design:returntype", Promise)
], OrdersController.prototype, "getOrdersByBuyer", null);
__decorate([
    (0, common_1.Patch)(":id"),
    (0, swagger_1.ApiOperation)({ summary: "Update an order" }),
    (0, swagger_1.ApiParam)({ name: "id", description: "Order ID" }),
    (0, swagger_1.ApiResponse)({ status: 200, description: "Order updated", type: order_schema_1.Order }),
    __param(0, (0, common_1.Param)("id")),
    __param(1, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, update_order_dto_1.UpdateOrderDto]),
    __metadata("design:returntype", Promise)
], OrdersController.prototype, "updateOrder", null);
__decorate([
    (0, common_1.Delete)(":id"),
    (0, swagger_1.ApiOperation)({ summary: "Delete an order" }),
    (0, swagger_1.ApiParam)({ name: "id", description: "Order ID" }),
    (0, swagger_1.ApiResponse)({ status: 204, description: "Order deleted" }),
    (0, common_1.HttpCode)(common_1.HttpStatus.NO_CONTENT),
    __param(0, (0, common_1.Param)("id")),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", Promise)
], OrdersController.prototype, "deleteOrder", null);
exports.OrdersController = OrdersController = __decorate([
    (0, swagger_1.ApiTags)("Orders"),
    (0, swagger_1.ApiBearerAuth)("jwt"),
    (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard),
    (0, common_1.Controller)("orders"),
    __metadata("design:paramtypes", [orders_service_1.OrdersService])
], OrdersController);
//# sourceMappingURL=orders.controller.js.map