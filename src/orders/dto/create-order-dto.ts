import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreateOrderDto {
    @ApiProperty({ example: '6645f1d8a8c02c2b8f5a9df0', description: 'Buyer user ID' })
    buyer: string;

    @ApiProperty({ example: '6645f1d8a8c02c2b8f5a9df1', description: 'Owner (shop or user) ID' })
    owner: string;

    @ApiProperty({ example: 'Shop', enum: ['Shop', 'User'], description: 'Owner model discriminator' })
    ownerModel: 'Shop' | 'User';

    @ApiProperty({ example: '6650aa2f17e0114f1e7a9a89', description: 'Product ID' })
    product: string;

    @ApiProperty({ example: 'self-pickup', enum: ['self-pickup', 'delivery'] })
    deliveryOption: 'self-pickup' | 'delivery';

    @ApiPropertyOptional({ example: 'pending', enum: ['pending', 'confirmed', 'shipped', 'delivered', 'cancelled'] })
    status?: 'pending' | 'confirmed' | 'shipped' | 'delivered' | 'cancelled';

    @ApiPropertyOptional({ example: 'cashonDelivery', enum: ['cashonDelivery', 'Easypaisa'] })
    paymentType?: 'cashonDelivery' | 'Easypaisa';

    @ApiProperty({ example: 499.99 }) 
    amount: number;

    @ApiProperty({ example: 1 })
    quantity: number;
}