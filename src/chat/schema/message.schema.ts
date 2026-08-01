// message.schema.ts
import { Prop, Schema, SchemaFactory } from "@nestjs/mongoose";
import { Document, Types } from "mongoose";

@Schema({ timestamps: true })
export class Message extends Document {
  @Prop({ type: Types.ObjectId, required: true, ref: "Conversation" })
  conversationId: Types.ObjectId;

  @Prop({ type: Types.ObjectId, required: true, ref: "User" })
  sender: Types.ObjectId;

  @Prop({ type: Types.ObjectId, required: true, ref: "User" })
  receiver: Types.ObjectId;

  @Prop({ type: String, required: false })
  text: string;

  // message.schema.ts
  @Prop({ type: String })
  imageUrl?: string; // Optional field for S3 link
  @Prop({ default: false })
  read: boolean;

  @Prop({ type: Date, default: Date.now })
  createdAt: Date;
}

export const MessageSchema = SchemaFactory.createForClass(Message);
