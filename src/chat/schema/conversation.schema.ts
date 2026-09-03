// conversation.schema.ts
import { Prop, Schema, SchemaFactory } from "@nestjs/mongoose";
import { Document, Types } from "mongoose";

@Schema({ timestamps: true })
export class Conversation extends Document {
  @Prop({ type: Types.ObjectId, required: true, ref: "User" })
  buyer!: Types.ObjectId;

  @Prop({ type: Types.ObjectId, required: true, ref: "User" })
  seller!: Types.ObjectId;

  @Prop({ type: String, enum: ["open", "closed"], default: "open" })
  status!: string;

  @Prop({ type: Date })
  lastMessageAt!: Date;

  /** Set when this conversation is scoped to one listing's offer negotiation; null for general buyer/seller chat. */
  @Prop({ type: Types.ObjectId, ref: "Product", default: null })
  product!: Types.ObjectId | null;

  /** Only enforced when `product` is set — blocks messaging until that listing's offer is accepted. */
  @Prop({ type: Boolean, default: false })
  locked!: boolean;
}

export const ConversationSchema = SchemaFactory.createForClass(Conversation);
ConversationSchema.index({ buyer: 1, seller: 1, product: 1 }, { unique: true });
