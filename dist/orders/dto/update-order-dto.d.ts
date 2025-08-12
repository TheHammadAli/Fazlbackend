export declare class UpdateOrderDto {
    status?: 'pending' | 'confirmed' | 'shipped' | 'delivered' | 'cancelled';
    paymentType?: 'cashonDelivery' | 'Easypaisa';
    amount?: number;
}
