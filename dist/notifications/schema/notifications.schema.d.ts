import { Document, Types } from "mongoose";
export type NotificationType = "ORDER" | "MESSAGE" | "PROMOTION" | "SERVICE_REQUEST";
export declare class Notification extends Document {
    userId: Types.ObjectId;
    type: NotificationType;
    message: string;
    metadata: Record<string, any>;
    read: boolean;
    payload: Record<string, any>;
}
export declare const NotificationSchema: import("mongoose").Schema<Notification, import("mongoose").Model<Notification, any, any, any, Document<unknown, any, Notification, any> & Notification & Required<{
    _id: unknown;
}> & {
    __v: number;
}, any>, {}, {}, {}, {}, import("mongoose").DefaultSchemaOptions, Notification, Document<unknown, {}, import("mongoose").FlatRecord<Notification>, {}> & import("mongoose").FlatRecord<Notification> & Required<{
    _id: unknown;
}> & {
    __v: number;
}>;
