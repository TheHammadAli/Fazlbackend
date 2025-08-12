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
exports.PaymentController = void 0;
const common_1 = require("@nestjs/common");
const payment_service_1 = require("./payment.service");
const create_payment_dto_1 = require("./dto/create-payment.dto");
const update_payment_status_dto_1 = require("./dto/update-payment-status.dto");
const swagger_1 = require("@nestjs/swagger");
let PaymentController = class PaymentController {
    paymentService;
    constructor(paymentService) {
        this.paymentService = paymentService;
    }
    async initiatePayment(createPaymentDto) {
        const payment = await this.paymentService.initiatePayment(createPaymentDto);
        if (!payment.paymentUrl || !payment.transactionId) {
            throw new common_1.InternalServerErrorException("Couldn't retrieve paymentUrl");
        }
        return {
            paymentUrl: payment.paymentUrl,
            transactionId: payment.transactionId,
        };
    }
    async handleWebhook(updateDto) {
        await this.paymentService.updateStatus(updateDto);
        return {
            message: 'Webhook received and payment status updated.',
        };
    }
    async getPayment(id) {
        return this.paymentService.findByTransactionId(id);
    }
};
exports.PaymentController = PaymentController;
__decorate([
    (0, common_1.Post)('initiate'),
    (0, swagger_1.ApiOperation)({ summary: 'Initiate a payment request' }),
    (0, swagger_1.ApiResponse)({ status: 201, description: 'Returns payment URL and transaction ID' }),
    (0, swagger_1.ApiBody)({ type: create_payment_dto_1.CreatePaymentDto }),
    __param(0, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [create_payment_dto_1.CreatePaymentDto]),
    __metadata("design:returntype", Promise)
], PaymentController.prototype, "initiatePayment", null);
__decorate([
    (0, common_1.Post)('webhook'),
    (0, common_1.HttpCode)(common_1.HttpStatus.OK),
    (0, swagger_1.ApiOperation)({ summary: 'Receive payment status update via webhook' }),
    (0, swagger_1.ApiBody)({ type: update_payment_status_dto_1.UpdatePaymentStatusDto }),
    (0, swagger_1.ApiResponse)({ status: 200, description: 'Acknowledges webhook' }),
    __param(0, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [update_payment_status_dto_1.UpdatePaymentStatusDto]),
    __metadata("design:returntype", Promise)
], PaymentController.prototype, "handleWebhook", null);
__decorate([
    (0, common_1.Get)(':id'),
    (0, swagger_1.ApiOperation)({ summary: 'Retrieve payment details by transaction ID' }),
    (0, swagger_1.ApiParam)({ name: 'id', required: true, description: 'Transaction ID' }),
    __param(0, (0, common_1.Param)('id')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", Promise)
], PaymentController.prototype, "getPayment", null);
exports.PaymentController = PaymentController = __decorate([
    (0, swagger_1.ApiTags)('Payments'),
    (0, common_1.Controller)('payments'),
    __metadata("design:paramtypes", [payment_service_1.PaymentService])
], PaymentController);
//# sourceMappingURL=payment.controller.js.map