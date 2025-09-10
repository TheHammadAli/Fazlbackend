import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';

export type OrderStatus = 'pending' | 'confirmed' | 'shipped' | 'delivered' | 'cancelled';
export type paymentType = 'cashonDelivery' | 'Easypaisa';

@Schema({
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
})
export class Order {
    @Prop({ type: Types.ObjectId, ref: 'User', required: true })
    buyer: Types.ObjectId; // Who purchased the product

    @Prop({ type: Types.ObjectId, refPath: 'ownerModel', required: true })
    owner: Types.ObjectId; // The owner (shop or user)

    @Prop({ type: String, required: true, enum: ['Shop', 'User'] })
    ownerModel: string; // Discriminator for owner

    @Prop({ type: Types.ObjectId, ref: 'Product', required: true })
    product: Types.ObjectId;

    @Prop({ type: String, enum: ['self-pickup', 'delivery'], required: true })
    deliveryOption: 'self-pickup' | 'delivery';

    @Prop({ type: String, enum: ['pending', 'confirmed', 'shipped', 'delivered', 'cancelled'], default: 'pending' })
    status: OrderStatus;

    @Prop({ type: String, enum: ['cashonDelivery', 'Easypaisa'], default: 'cashonDelivery' })
    paymentType: paymentType;


    @Prop({ type: Number, required: true })
    amount: number;
    @Prop({ type: Number, required: true })
    quantity: number;
    @Prop({ type: Object, required: false })
    variant?: Record<string, any>;
}

export const OrderSchema = SchemaFactory.createForClass(Order);
export type OrderDocument = Order & Document;