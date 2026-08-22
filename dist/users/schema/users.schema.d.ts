import { Document } from "mongoose";
import { Location } from "./users.interfaces";
import { PermissionEntry } from "./permission-entry.schema";
export declare class User {
    userCode?: string;
    name: string;
    email: string;
    password: string;
    roles: string[];
    permissions: PermissionEntry[];
    phone?: string;
    language: "en" | "ur";
    isVerified: boolean;
    location: Location;
    refreshToken?: string | null;
    resetPasswordToken?: string | null;
    image?: string | null;
    resetPasswordExpires?: Date | null;
    provider?: string | null;
    address?: string | null;
    fcmToken?: string;
    isDisabled: boolean;
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
