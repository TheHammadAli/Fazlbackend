import { Model } from "mongoose";
import { I18nService } from "nestjs-i18n";
import { Payment, PaymentDocument } from "./schema/payment.schema";
import { CreatePaymentDto } from "./dto/create-payment.dto";
import { UpdatePaymentStatusDto } from "./dto/update-payment-status.dto";
import { UsersService } from "../users/users.service";
import { ProductsService } from "../products/products.service";
import { ServicesService } from "../services/services.service";
export declare class PaymentService {
    private paymentModel;
    private readonly userService;
    private readonly productService;
    private readonly serviceService;
    private readonly i18n;
    constructor(paymentModel: Model<PaymentDocument>, userService: UsersService, productService: ProductsService, serviceService: ServicesService, i18n: I18nService);
    initiatePayment(createDto: CreatePaymentDto, lang?: string): Promise<Payment>;
    updateStatus(dto: UpdatePaymentStatusDto): Promise<Payment>;
    findByTransactionId(txnId: string): Promise<Payment>;
    markRefunded(id: string): Promise<Payment>;
    private mockEasyPaisaGateway;
}
