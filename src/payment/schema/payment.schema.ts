// src/payments/schemas/payment.schema.ts

import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';

export type PaymentDocument = Payment & Document;

@Schema({ timestamps: true })
export class Payment {
  @Prop({ type: Types.ObjectId, required: true, ref: 'User' })
  userId: Types.ObjectId;

  @Prop({ type: Types.ObjectId, required: true })
  itemId: Types.ObjectId; // can be product or service

  @Prop({ required: true, enum: ['product', 'service'] })
  itemType: 'product' | 'service';

  @Prop({ required: true })
  amount: number;

  @Prop({ enum: ['pending', 'success', 'failed', 'cancelled'], default: 'pending' })
  status: 'pending' | 'success' | 'failed' | 'cancelled';

  @Prop()
  transactionId?: string; // PSP transaction ref (e.g., EasyPaisa)

  @Prop()
  paymentUrl?: string; // URL user is redirected to (optional)

  @Prop()
  provider?: string; // easypaisa, jazzcash, etc.

  @Prop({ default: false })
  isRefunded: boolean;

  @Prop()
  refundDate?: Date;

  @Prop()
  paidAt?: Date;

}

export const PaymentSchema = SchemaFactory.createForClass(Payment);
