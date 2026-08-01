import { Prop, Schema, SchemaFactory } from "@nestjs/mongoose";
import { HydratedDocument, Types } from "mongoose";

export type BroadcastMessageDocument = HydratedDocument<BroadcastMessage>;

@Schema({ timestamps: true })
export class BroadcastMessage {
  @Prop({ type: Types.ObjectId, required: true, ref: "Broadcast" })
  broadcast: Types.ObjectId;

  @Prop({ type: Types.ObjectId, required: true, ref: "User" })
  sender: Types.ObjectId;

  @Prop({ type: Types.ObjectId, required: true, ref: "User" })
  receiver: Types.ObjectId;

  @Prop({ type: Types.ObjectId, ref: "BroadcastThread", required: true })
  thread: Types.ObjectId;
  @Prop({ type: String, required: false })
  message: string;
  @Prop({ required: false })
  imageUrls?: string[]; // Optional field for S3 link
}

export const BroadcastMessageSchema =
  SchemaFactory.createForClass(BroadcastMessage);
