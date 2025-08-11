
import { Prop, Schema, SchemaFactory } from "@nestjs/mongoose";
import { Document } from "mongoose";

@Schema({ timestamps: true })
export class Subscription extends Document {
    @Prop({ required: true, enum: ['Product', 'Shop'] })
    targetType: 'Product' | 'Shop';

    @Prop({ required: true })
    name: string;

    @Prop({ required: true })
    price: number;

    @Prop({ required: true })
    durationInDays: number;

    @Prop({ required: true, enum: ['listing', 'feed'], default: 'listing' })
    screenType?: 'listing' | 'feed'; // only relevant for product subscriptions

    @Prop()
    description?: string;
}
export const SubscriptionSchema = SchemaFactory.createForClass(Subscription);
export type SubscriptionDocument = Subscription & Document; 