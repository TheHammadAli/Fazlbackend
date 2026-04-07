import { Document, Types } from 'mongoose';
export declare class BroadcastThread extends Document {
    broadcast: Types.ObjectId;
    buyer: Types.ObjectId;
    seller: Types.ObjectId;
    lastMessageAt: Date;
}
export declare const BroadcastThreadSchema: import("mongoose").Schema<BroadcastThread, import("mongoose").Model<BroadcastThread, any, any, any, Document<unknown, any, BroadcastThread, any> & BroadcastThread & Required<{
    _id: unknown;
}> & {
    __v: number;
}, any>, {}, {}, {}, {}, import("mongoose").DefaultSchemaOptions, BroadcastThread, Document<unknown, {}, import("mongoose").FlatRecord<BroadcastThread>, {}> & import("mongoose").FlatRecord<BroadcastThread> & Required<{
    _id: unknown;
}> & {
    __v: number;
}>;
