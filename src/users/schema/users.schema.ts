import { Prop, Schema, SchemaFactory } from "@nestjs/mongoose";
import { Document } from "mongoose";
import { Location } from "./users.interfaces";
import { PermissionEntry, PermissionEntrySchema } from "./permission-entry.schema";
@Schema({
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true },
})
export class User {
  @Prop({ unique: true, sparse: true, required: false })
  userCode?: string;

  @Prop({ required: false, trim: true })
  name: string;

  @Prop({ required: true, unique: true, lowercase: true })
  email: string;

  @Prop({ required: false, select: false }) // Hide password in queries
  password: string;

  /** Separate admin-panel password for a user account that was later promoted to member —
   *  keeps their original account password working on the main app while giving them a
   *  distinct credential for the admin panel. Unset for member accounts created fresh
   *  (those only ever have one password: `password`). */
  @Prop({ required: false, select: false })
  memberPassword?: string;

  @Prop({
    type: [String],
    enum: ["buyer", "seller", "admin", "subadmin", "super_admin", "moderator"],
    default: ["buyer"],
  })
  roles: string[];

  @Prop({
    type: [PermissionEntrySchema],
    default: [],
  })
  permissions: PermissionEntry[];

  @Prop({ unique: true, sparse: true, required: false })
  phone?: string;
  language: "en" | "ur";
  isVerified: boolean;
  @Prop({
    type: {
      type: String,
      enum: ["Point"],
      required: false,
    },
    coordinates: {
      type: [Number],
      required: false,
    },
  })
  location: Location;

  @Prop({ type: String, select: false })
  refreshToken?: string | null;

  @Prop({ type: String, select: false })
  resetPasswordToken?: string | null;

  @Prop({ type: String || null || undefined, default: "default-avatar.png" })
  image?: string | null;
  @Prop({ type: Date, select: false })
  resetPasswordExpires?: Date | null;

  @Prop({ type: String, select: false })
  provider?: string | null;

  @Prop({ type: String })
  address?: string | null;

  @Prop({ type: String, required: false })
  fcmToken?: string; // st

  @Prop({ type: Boolean, default: false })
  isDisabled: boolean;

  @Prop({ type: Date, required: false, default: null })
  lastSeenAt?: Date | null;
}

export const UserSchema = SchemaFactory.createForClass(User);

UserSchema.methods.toJSON = function () {
  const user = this.toObject();
  delete user.password;
  delete user.memberPassword;
  delete user.__v;
  return user;
};

export type UserDocument = User & Document;
UserSchema.index({ location: "2dsphere" });
