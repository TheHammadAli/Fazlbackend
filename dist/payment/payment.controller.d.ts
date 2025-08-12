import { PaymentService } from './payment.service';
import { CreatePaymentDto } from './dto/create-payment.dto';
import { UpdatePaymentStatusDto } from './dto/update-payment-status.dto';
import { Payment } from './schema/payment.schema';
export declare class PaymentController {
    private readonly paymentService;
    constructor(paymentService: PaymentService);
    initiatePayment(createPaymentDto: CreatePaymentDto): Promise<{
        paymentUrl: string;
        transactionId: string;
    }>;
    handleWebhook(updateDto: UpdatePaymentStatusDto): Promise<{
        message: string;
    }>;
    getPayment(id: string): Promise<Payment>;
}
