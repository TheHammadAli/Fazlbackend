import { Document, Types } from "mongoose";
export type LikeDocument = Like & Document;
export declare class Like {
    userId: Types.ObjectId;
    itemId: Types.ObjectId;
    itemType: "product" | "service";
    ownerModel: "Shop" | "User";
}
export declare const LikeSchema: import("mongoose").Schema<Like, import("mongoose").Model<Like, any, any, any, Document<unknown, any, Like, any> & Like & {
    _id: Types.ObjectId;
} & {
    __v: number;
}, any>, {}, {}, {}, {}, import("mongoose").DefaultSchemaOptions, Like, Document<unknown, {}, import("mongoose").FlatRecord<Like>, {}> & import("mongoose").FlatRecord<Like> & {
    _id: Types.ObjectId;
} & {
    __v: number;
}>;
