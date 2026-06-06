import { Document, Types } from "mongoose";
export type ShopDocument = Shop & Document;
export declare class Shop {
    ownerId: Types.ObjectId;
    title: string;
    image: string;
    banner: string;
    address: string;
    description: string;
    isDisabled?: boolean;
    location: {
        type: "Point";
        coordinates: [number, number];
    };
}
export declare const ShopSchema: import("mongoose").Schema<Shop, import("mongoose").Model<Shop, any, any, any, Document<unknown, any, Shop, any> & Shop & {
    _id: Types.ObjectId;
} & {
    __v: number;
}, any>, {}, {}, {}, {}, import("mongoose").DefaultSchemaOptions, Shop, Document<unknown, {}, import("mongoose").FlatRecord<Shop>, {}> & import("mongoose").FlatRecord<Shop> & {
    _id: Types.ObjectId;
} & {
    __v: number;
}>;
