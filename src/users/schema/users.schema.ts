import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';
import { Location } from './users.interfaces';
@Schema({
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true },
})
export class User {
  @Prop({ required: false, trim: true })
  name: string;

  @Prop({ required: true, unique: true, lowercase: true })
  email: string;

  @Prop({ required: false, select: false }) // Hide password in queries
  password: string;

  @Prop({
    type: [String],
    enum: ['buyer', 'seller', 'admin', 'subadmin'],
    default: ['buyer'],
  })
  roles: string[];

  @Prop({ required: false, unique: true })
  phone: string;
  language: 'en' | 'ur';
  isVerified: Boolean;
  @Prop({
    type: {
      type: String,
      enum: ['Point'],
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

  @Prop({ type: String || null || undefined, default: null })
  image?: string | null;
  @Prop({ type: Date, select: false })
  resetPasswordExpires?: Date | null;


  @Prop({ type: String, select: false })
  provider?: string | null;

  @Prop({ type: String, default: "default-avatar.png" })
  address?: string | null;
}

export const UserSchema = SchemaFactory.createForClass(User);

UserSchema.methods.toJSON = function () {
  const user = this.toObject();
  delete user.password;
  delete user.__v;
  return user;
};

export type UserDocument = User & Document;
UserSchema.index({ location: '2dsphere' });
