import { Prop, Schema, SchemaFactory } from "@nestjs/mongoose";
import { Document, Types } from "mongoose";

export type ShareDocument = Share & Document;

/** One row per (user, item) pair, ever — existence = "this user has shared this item". */
@Schema({ timestamps: true })
export class Share {
  @Prop({ type: Types.ObjectId, ref: "User", required: true })
  userId: Types.ObjectId;

  @Prop({ type: Types.ObjectId, required: true })
  itemId: Types.ObjectId;

  @Prop({
    type: String,
    required: true,
    enum: ["product", "service"],
  })
  itemType: "product" | "service";
}

export const ShareSchema = SchemaFactory.createForClass(Share);

// One share per user per item — repeat shares by the same user don't recount.
ShareSchema.index({ userId: 1, itemId: 1, itemType: 1 }, { unique: true });
