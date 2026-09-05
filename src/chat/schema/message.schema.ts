// message.schema.ts
import { Prop, Schema, SchemaFactory } from "@nestjs/mongoose";
import { Document, Types } from "mongoose";

@Schema({ timestamps: true })
export class Message extends Document {
  // Type-only override so TS resolves `_id` as ObjectId instead of `unknown` on
  // Document instances — `declare` means no field is actually emitted, Mongoose
  // still manages the real _id automatically.
  declare _id: Types.ObjectId;

  @Prop({ type: Types.ObjectId, required: true, ref: "Conversation" })
  conversationId: Types.ObjectId;

  @Prop({ type: Types.ObjectId, required: true, ref: "User" })
  sender: Types.ObjectId;

  @Prop({ type: Types.ObjectId, required: true, ref: "User" })
  receiver: Types.ObjectId;

  @Prop({ type: String, required: false })
  text: string;

  // Only set on system-generated messages (e.g. offer accept/decline/expiry) where
  // what happened reads differently depending on which participant is looking —
  // "You sent an offer (Accepted)" is only true for whoever sent the offer, not
  // whoever responded to it. When present, the sender's own client shows this
  // instead of `text`; every other message leaves it unset and renders exactly
  // as before.
  @Prop({ type: String })
  senderText?: string;

  // message.schema.ts
  @Prop({ type: String })
  imageUrl?: string; // Optional field for S3 link

  @Prop({ type: String })
  audioUrl?: string; // Optional field for S3/CDN link to a voice message

  @Prop({ type: Number })
  audioDuration?: number; // Voice message length in seconds

  @Prop({ default: false })
  read: boolean;

  // Kept in sync with `read` (status === 'read' <=> read === true) so every
  // existing unread-count query/aggregation that filters on `read` keeps
  // working unchanged; `status` is the source of truth for tick rendering.
  @Prop({ type: String, enum: ["sent", "delivered", "read"], default: "sent" })
  status: string;

  @Prop({ type: Date })
  deliveredAt?: Date;

  @Prop({ type: Date })
  readAt?: Date;

  @Prop({ type: Date, default: Date.now })
  createdAt: Date;
}

export const MessageSchema = SchemaFactory.createForClass(Message);
MessageSchema.index({ receiver: 1, status: 1 });
