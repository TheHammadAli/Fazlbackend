import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';
import { Location } from './users.interfaces';
@Schema({
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true },
})
export class User {
  @Prop({ required: true, trim: true })
  name: string;

  @Prop({ required: true, unique: true, lowercase: true })
  email: string;

  @Prop({ required: true, select: false }) // Hide password in queries
  password: string;

  @Prop({
    type: [String],
    enum: ['buyer', 'seller', 'admin', 'subadmin'],
    default: ['buyer'],
  })
  roles: string[];

  @Prop({ required: true, unique: true })
  phone: string;
  language: 'en' | 'ur';
  isVerified: Boolean;
  @Prop({
    type: {
      type: String,
      enum: ['Point'],
      required: true,
    },
    coordinates: {
      type: [Number],
      required: true,
    },
  })
  location: Location;

  @Prop({ type: String, select: false })
  refreshToken?: string | null;
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
