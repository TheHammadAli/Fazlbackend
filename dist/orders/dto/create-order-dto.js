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
exports.CreateOrderDto = void 0;
const swagger_1 = require("@nestjs/swagger");
const class_validator_1 = require("class-validator");
class CreateOrderDto {
    buyer;
    owner;
    ownerModel;
    product;
    deliveryOption;
    status;
    paymentType;
    amount;
    variant;
    quantity;
}
exports.CreateOrderDto = CreateOrderDto;
__decorate([
    (0, swagger_1.ApiProperty)({ example: '6645f1d8a8c02c2b8f5a9df0', description: 'Buyer user ID' }),
    __metadata("design:type", String)
], CreateOrderDto.prototype, "buyer", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({ example: '6645f1d8a8c02c2b8f5a9df1', description: 'Owner (shop or user) ID' }),
    __metadata("design:type", String)
], CreateOrderDto.prototype, "owner", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({ example: 'Shop', enum: ['Shop', 'User'], description: 'Owner model discriminator' }),
    __metadata("design:type", String)
], CreateOrderDto.prototype, "ownerModel", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({ example: '6650aa2f17e0114f1e7a9a89', description: 'Product ID' }),
    __metadata("design:type", String)
], CreateOrderDto.prototype, "product", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({ example: 'self-pickup', enum: ['self-pickup', 'delivery'] }),
    __metadata("design:type", String)
], CreateOrderDto.prototype, "deliveryOption", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)({ example: 'pending', enum: ['pending', 'confirmed', 'shipped', 'delivered', 'cancelled'] }),
    __metadata("design:type", String)
], CreateOrderDto.prototype, "status", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)({ example: 'cashonDelivery', enum: ['cashonDelivery', 'Easypaisa'] }),
    __metadata("design:type", String)
], CreateOrderDto.prototype, "paymentType", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({ example: 499.99 }),
    __metadata("design:type", Number)
], CreateOrderDto.prototype, "amount", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({ example: { "size": "M", "color": "black" } }),
    (0, class_validator_1.IsOptional)(),
    __metadata("design:type", Object)
], CreateOrderDto.prototype, "variant", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({ example: 1 }),
    __metadata("design:type", Number)
], CreateOrderDto.prototype, "quantity", void 0);
//# sourceMappingURL=create-order-dto.js.map