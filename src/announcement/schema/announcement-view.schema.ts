import { Prop, Schema, SchemaFactory } from "@nestjs/mongoose";
import { Document, Types } from "mongoose";

/** One row per (announcement, user, day) — existence = "this user viewed this announcement on
 *  this day". Same day-level dedup idiom as ProductView/ServiceView: a page refresh within the
 *  same day never recounts, a return visit on a later day does. */
@Schema({ timestamps: true })
export class AnnouncementView {
  @Prop({ type: Types.ObjectId, ref: "Announcement", required: true })
  announcementId: Types.ObjectId;

  @Prop({ type: Types.ObjectId, ref: "User", required: true })
  userId: Types.ObjectId;

  @Prop({ type: String, required: true })
  day: string;
}

export type AnnouncementViewDocument = AnnouncementView & Document;
export const AnnouncementViewSchema = SchemaFactory.createForClass(AnnouncementView);
AnnouncementViewSchema.index({ announcementId: 1, userId: 1, day: 1 }, { unique: true });
