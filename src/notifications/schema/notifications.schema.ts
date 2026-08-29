// notification.entity.ts
import { Prop, Schema, SchemaFactory } from "@nestjs/mongoose";
import { Document, Types } from "mongoose";

export type NotificationType =
  | "ORDER"
  | "MESSAGE"
  | "PROMOTION"
  | "SERVICE_REQUEST"
  | "BROADCAST"
  | "ANNOUNCEMENT"
  | "LIKE";

@Schema({ timestamps: true })
export class Notification extends Document {
  @Prop({ required: true })
  userId!: Types.ObjectId; // recipient

  @Prop({
    required: true,
    // Kept in step with NotificationType above by hand — Mongoose validates this
    // enum on save, so a type missing here throws at write time, not compile time.
    enum: [
      "ORDER",
      "MESSAGE",
      "PROMOTION",
      "SERVICE_REQUEST",
      "BROADCAST",
      "ANNOUNCEMENT",
      "LIKE",
    ],
  })
  type!: NotificationType;

  @Prop({ required: true })
  message!: string;

  @Prop({ type: Object, default: {} })
  metadata!: Record<string, any>; // extra info, e.g. orderId, senderId

  @Prop({ default: false })
  read!: boolean;


  @Prop({ type: Object, default: {} })
  payload!: Record<string, any>;
}

export const NotificationSchema = SchemaFactory.createForClass(Notification);
