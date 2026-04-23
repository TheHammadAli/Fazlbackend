import { HydratedDocument, Types } from "mongoose";
export type BroadcastDocument = HydratedDocument<Broadcast>;
export declare class Broadcast {
    buyer: Types.ObjectId;
    message: string;
    category: Types.ObjectId;
    radius: number;
    location: {
        type: "Point";
        coordinates: [number, number];
    };
    type: "product" | "service";
    expiresAt: Date;
    lastResponseAt: Date;
}
export declare const BroadcastSchema: import("mongoose").Schema<Broadcast, import("mongoose").Model<Broadcast, any, any, any, import("mongoose").Document<unknown, any, Broadcast, any> & Broadcast & {
    _id: Types.ObjectId;
} & {
    __v: number;
}, any>, {}, {}, {}, {}, import("mongoose").DefaultSchemaOptions, Broadcast, import("mongoose").Document<unknown, {}, import("mongoose").FlatRecord<Broadcast>, {}> & import("mongoose").FlatRecord<Broadcast> & {
    _id: Types.ObjectId;
} & {
    __v: number;
}>;
