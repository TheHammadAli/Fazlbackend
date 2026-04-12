// conversation.schema.ts
import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';

@Schema({ timestamps: true })

export class Conversation extends Document {
  @Prop({ type: Types.ObjectId, required: true, ref: 'User' })
  buyer!: Types.ObjectId;

  @Prop({ type: Types.ObjectId, required: true, ref: 'User' })
  seller!: Types.ObjectId;

  @Prop({ type: String, enum: ['open', 'closed'], default: 'open' })
  status!: string;

  @Prop({ type: Date })
  lastMessageAt!: Date;
}

export const ConversationSchema = SchemaFactory.createForClass(Conversation);
ConversationSchema.index({ buyer: 1, seller: 1 }, { unique: true });