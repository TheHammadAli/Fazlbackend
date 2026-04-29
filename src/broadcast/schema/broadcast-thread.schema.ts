import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';

@Schema({ timestamps: true })
export class BroadcastThread extends Document {
  @Prop({ type: Types.ObjectId, ref: 'Broadcast', required: true })
  broadcast: Types.ObjectId;

  @Prop({ type: Types.ObjectId, ref: 'User', required: true })
  buyer: Types.ObjectId;

  @Prop({ type: Types.ObjectId, ref: 'User', required: true })
  seller: Types.ObjectId;

  @Prop({ type: Date })
  lastMessageAt: Date;
  
}

export const BroadcastThreadSchema =
  SchemaFactory.createForClass(BroadcastThread);

// 🔥 Index for fast lookup
BroadcastThreadSchema.index({ broadcast: 1, seller: 1 }, { unique: true });