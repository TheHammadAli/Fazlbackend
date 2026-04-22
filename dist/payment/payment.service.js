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
exports.PaymentService = void 0;
const common_1 = require("@nestjs/common");
const mongoose_1 = require("@nestjs/mongoose");
const mongoose_2 = require("mongoose");
const nestjs_i18n_1 = require("nestjs-i18n");
const payment_schema_1 = require("./schema/payment.schema");
const users_service_1 = require("../users/users.service");
const products_service_1 = require("../products/products.service");
const services_service_1 = require("../services/services.service");
let PaymentService = class PaymentService {
    paymentModel;
    userService;
    productService;
    serviceService;
    i18n;
    constructor(paymentModel, userService, productService, serviceService, i18n) {
        this.paymentModel = paymentModel;
        this.userService = userService;
        this.productService = productService;
        this.serviceService = serviceService;
        this.i18n = i18n;
    }
    async initiatePayment(createDto, lang = "en") {
        const user = await this.userService.findUserById(createDto.userId);
        if (!user)
            throw new common_1.NotFoundException(this.i18n.translate("payment.user_not_found", { lang }));
        switch (createDto.itemType) {
            case "product":
                const product = await this.productService.getById(createDto.itemId, lang);
                if (!product)
                    throw new common_1.NotFoundException(this.i18n.translate("payment.product_not_found", { lang }));
                break;
            case "service":
                const service = await this.serviceService.getById(createDto.itemId);
                if (!service)
                    throw new common_1.NotFoundException(this.i18n.translate("payment.service_not_found", { lang }));
                break;
            default:
                throw new common_1.NotFoundException(this.i18n.translate("payment.invalid_item_type", { lang }));
        }
        const payment = new this.paymentModel({
            userId: new mongoose_2.Types.ObjectId(createDto.userId),
            itemId: new mongoose_2.Types.ObjectId(createDto.itemId),
            itemType: createDto.itemType,
            amount: createDto.amount,
            provider: "easypaisa",
            status: "pending",
        });
        await payment.save();
        const easypaisaResponse = await this.mockEasyPaisaGateway(payment);
        payment.transactionId = easypaisaResponse.transactionId;
        payment.paymentUrl = easypaisaResponse.paymentUrl;
        return payment.save();
    }
    async updateStatus(dto) {
        const payment = await this.paymentModel.findOne({
            transactionId: dto.transactionId,
        });
        if (!payment)
            throw new common_1.NotFoundException("Transaction not found");
        payment.status = dto.status;
        if (dto.status === "success") {
            payment.paidAt = new Date();
        }
        return payment.save();
    }
    async findByTransactionId(txnId) {
        const payment = await this.paymentModel.findOne({ transactionId: txnId });
        if (!payment)
            throw new common_1.NotFoundException("Payment not found");
        return payment;
    }
    async markRefunded(id) {
        const payment = await this.paymentModel.findById(id);
        if (!payment)
            throw new common_1.NotFoundException("Payment not found");
        payment.isRefunded = true;
        payment.refundDate = new Date();
        return payment.save();
    }
    async mockEasyPaisaGateway(payment) {
        return {
            transactionId: "EZP-" + Date.now(),
            paymentUrl: `https://easypaisa.mock/redirect/${payment._id}`,
        };
    }
};
exports.PaymentService = PaymentService;
exports.PaymentService = PaymentService = __decorate([
    (0, common_1.Injectable)(),
    __param(0, (0, mongoose_1.InjectModel)(payment_schema_1.Payment.name)),
    __metadata("design:paramtypes", [mongoose_2.Model,
        users_service_1.UsersService,
        products_service_1.ProductsService,
        services_service_1.ServicesService,
        nestjs_i18n_1.I18nService])
], PaymentService);
//# sourceMappingURL=payment.service.js.map