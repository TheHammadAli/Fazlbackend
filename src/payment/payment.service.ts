// src/payments/payment.service.ts

import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { Payment, PaymentDocument } from './schema/payment.schema';
import { CreatePaymentDto } from './dto/create-payment.dto';
import { UpdatePaymentStatusDto } from './dto/update-payment-status.dto';

// Import dependent services instead of models
import { UsersService } from '../users/users.service';
import { ProductsService } from '../products/products.service';
import { ServicesService } from '../services/services.service';
import { create } from 'domain';

@Injectable()
export class PaymentService {
  constructor(
    @InjectModel(Payment.name) private paymentModel: Model<PaymentDocument>,
    private readonly userService: UsersService,
    private readonly productService: ProductsService,
    private readonly serviceService: ServicesService,
  ) {}

  async initiatePayment(createDto: CreatePaymentDto): Promise<Payment> {
    // ✅ Validate user
    const user = await this.userService.findUserById(createDto.userId);
    if (!user) throw new NotFoundException('User not found');

    // ✅ Validate item based on type
    switch (createDto.itemType) {
      case 'product':
        const product = await this.productService.getById(createDto.itemId);
        if (!product) throw new NotFoundException('Product not found');
        break;
      case 'service':
        const service = await this.serviceService.getById(createDto.itemId);
        if (!service) throw new NotFoundException('Service not found');
        break;
      default:
        throw new NotFoundException('Invalid itemType');
    }

    // ✅ Create payment
    const payment = new this.paymentModel({
      userId: new Types.ObjectId(createDto.userId),
      itemId: new Types.ObjectId(createDto.itemId),
      itemType: createDto.itemType,
      amount: createDto.amount,
      provider: 'easypaisa',
      status: 'pending',
    });

    await payment.save();

    // ✅ Mock EasyPaisa redirect
    const easypaisaResponse = await this.mockEasyPaisaGateway(payment);

    payment.transactionId = easypaisaResponse.transactionId;
    payment.paymentUrl = easypaisaResponse.paymentUrl;

    return payment.save();
  }

  async updateStatus(dto: UpdatePaymentStatusDto): Promise<Payment> {
    const payment = await this.paymentModel.findOne({
      transactionId: dto.transactionId,
    });

    if (!payment) throw new NotFoundException('Transaction not found');

    payment.status = dto.status;
    if (dto.status === 'success') {
      payment.paidAt = new Date();
    }

    return payment.save();
  }

  async findByTransactionId(txnId: string): Promise<Payment> {
    const payment = await this.paymentModel.findOne({ transactionId: txnId });
    if (!payment) throw new NotFoundException('Payment not found');
    return payment;
  }

  async markRefunded(id: string): Promise<Payment> {
    const payment = await this.paymentModel.findById(id);
    if (!payment) throw new NotFoundException('Payment not found');

    payment.isRefunded = true;
    payment.refundDate = new Date();
    return payment.save();
  }

  private async mockEasyPaisaGateway(payment: PaymentDocument): Promise<{
    transactionId: string;
    paymentUrl: string;
  }> {
    return {
      transactionId: 'EZP-' + Date.now(),
      paymentUrl: `https://easypaisa.mock/redirect/${payment._id}`,
    };
  }
}
