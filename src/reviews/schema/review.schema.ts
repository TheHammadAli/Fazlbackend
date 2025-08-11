// src/reviews/schema/review.schema.ts

import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';

export type ReviewDocument = Review & Document;

@Schema({ timestamps: true })
export class Review {
  @Prop({ type: Types.ObjectId, required: true, ref: 'User' })
  userId: Types.ObjectId;

  @Prop({ type: Types.ObjectId, required: true })
  itemId: Types.ObjectId;

  @Prop({ required: true, enum: ['product', 'service'] })
  itemType: 'product' | 'service';

  @Prop({ required: true, min: 1, max: 5 })
  rating: number;

  @Prop({ type: String, maxlength: 1000 })
  comment: string;

  @Prop({ default: false })
  isFlagged: boolean;
}

export const ReviewSchema = SchemaFactory.createForClass(Review);
