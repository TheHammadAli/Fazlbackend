import { Prop, Schema, SchemaFactory } from "@nestjs/mongoose";
import { HydratedDocument, Types } from "mongoose";

export type AnnouncementDocument = HydratedDocument<Announcement>;

@Schema({ timestamps: true })
export class Announcement {
  @Prop({ unique: true, sparse: true, required: false })
  announcementCode?: string;

  @Prop({ type: String, required: true, trim: true })
  title: string;

  @Prop({ type: String, required: true, trim: true })
  message: string;

  @Prop({ type: Types.ObjectId, required: true, ref: "User" })
  createdBy: Types.ObjectId;
}

export const AnnouncementSchema = SchemaFactory.createForClass(Announcement);
