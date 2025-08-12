export declare class CreatePaymentDto {
    userId: string;
    itemId: string;
    itemType: 'product' | 'service';
    amount: number;
}
