export declare class CreateOrderDto {
    buyer: string;
    owner: string;
    ownerModel: 'Shop' | 'User';
    product: string;
    deliveryOption: 'self-pickup' | 'delivery';
    status?: 'pending' | 'confirmed' | 'shipped' | 'delivered' | 'cancelled';
    paymentType?: 'cashonDelivery' | 'Easypaisa';
    amount: number;
    quantity: number;
}
