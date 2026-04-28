import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';

export type LikeDocument = Like & Document;

@Schema({
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true },
})
export class Like {
  @Prop({ type: Types.ObjectId, ref: 'User', required: true })
  userId: Types.ObjectId;

  @Prop({ type: Types.ObjectId, required: true })
  itemId: Types.ObjectId;

  @Prop({ 
    type: String, 
    required: true, 
    enum: ['product', 'service'] 
  })
  itemType: 'product' | 'service';

  @Prop({ 
    type: String, 
    required: true, 
    enum: ['Shop', 'User'] 
  })
  ownerModel: 'Shop' | 'User';
}

export const LikeSchema = SchemaFactory.createForClass(Like);

// Compound index to ensure one like per user per item
LikeSchema.index({ userId: 1, itemId: 1, itemType: 1 }, { unique: true });