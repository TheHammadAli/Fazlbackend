import { HydratedDocument, Types } from "mongoose";
export type BroadcastMessageDocument = HydratedDocument<BroadcastMessage>;
export declare class BroadcastMessage {
    broadcast: Types.ObjectId;
    sender: Types.ObjectId;
    receiver: Types.ObjectId;
    thread: Types.ObjectId;
    message: string;
    imageUrl?: string[];
}
export declare const BroadcastMessageSchema: import("mongoose").Schema<BroadcastMessage, import("mongoose").Model<BroadcastMessage, any, any, any, import("mongoose").Document<unknown, any, BroadcastMessage, any> & BroadcastMessage & {
    _id: Types.ObjectId;
} & {
    __v: number;
}, any>, {}, {}, {}, {}, import("mongoose").DefaultSchemaOptions, BroadcastMessage, import("mongoose").Document<unknown, {}, import("mongoose").FlatRecord<BroadcastMessage>, {}> & import("mongoose").FlatRecord<BroadcastMessage> & {
    _id: Types.ObjectId;
} & {
    __v: number;
}>;
