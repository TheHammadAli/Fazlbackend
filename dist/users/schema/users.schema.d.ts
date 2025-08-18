import { Document } from 'mongoose';
import { Location } from './users.interfaces';
export declare class User {
    name: string;
    email: string;
    password: string;
    roles: string[];
    phone: string;
    language: 'en' | 'ur';
    isVerified: Boolean;
    location: Location;
    refreshToken?: string | null;
    resetPasswordToken?: string | null;
    resetPasswordExpires?: Date | null;
    provider?: string | null;
}
export declare const UserSchema: import("mongoose").Schema<User, import("mongoose").Model<User, any, any, any, Document<unknown, any, User, any> & User & {
    _id: import("mongoose").Types.ObjectId;
} & {
    __v: number;
}, any>, {}, {}, {}, {}, import("mongoose").DefaultSchemaOptions, User, Document<unknown, {}, import("mongoose").FlatRecord<User>, {}> & import("mongoose").FlatRecord<User> & {
    _id: import("mongoose").Types.ObjectId;
} & {
    __v: number;
}>;
export type UserDocument = User & Document;
