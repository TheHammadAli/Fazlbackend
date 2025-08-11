import {
  Controller,
  Post,
  Body,
  Param,
  Get,
  UseGuards,
  HttpCode,
  HttpStatus,
  InternalServerErrorException,
} from '@nestjs/common';
import { PaymentService } from './payment.service';
import { CreatePaymentDto } from './dto/create-payment.dto';
import { UpdatePaymentStatusDto } from './dto/update-payment-status.dto';
import { Payment } from './schema/payment.schema';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBody,
  ApiParam,
} from '@nestjs/swagger';

@ApiTags('Payments')
@Controller('payments')
export class PaymentController {
  constructor(private readonly paymentService: PaymentService) {}

  @Post('initiate')
  @ApiOperation({ summary: 'Initiate a payment request' })
  @ApiResponse({ status: 201, description: 'Returns payment URL and transaction ID' })
  @ApiBody({ type: CreatePaymentDto })
  async initiatePayment(
    @Body() createPaymentDto: CreatePaymentDto,
  ): Promise<{ paymentUrl: string; transactionId: string }> {
    const payment: Payment =
      await this.paymentService.initiatePayment(createPaymentDto);
    if (!payment.paymentUrl || !payment.transactionId) {
      throw new InternalServerErrorException("Couldn't retrieve paymentUrl");
    }
    return {
      paymentUrl: payment.paymentUrl,
      transactionId: payment.transactionId,
    };
  }

  @Post('webhook')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Receive payment status update via webhook' })
  @ApiBody({ type: UpdatePaymentStatusDto })
  @ApiResponse({ status: 200, description: 'Acknowledges webhook' })
  async handleWebhook(
    @Body() updateDto: UpdatePaymentStatusDto,
  ): Promise<{ message: string }> {
    await this.paymentService.updateStatus(updateDto);
    return {
      message: 'Webhook received and payment status updated.',
    };
  }

  @Get(':id')
  @ApiOperation({ summary: 'Retrieve payment details by transaction ID' })
  @ApiParam({ name: 'id', required: true, description: 'Transaction ID' })
  async getPayment(@Param('id') id: string): Promise<Payment> {
    return this.paymentService.findByTransactionId(id);
  }
}
