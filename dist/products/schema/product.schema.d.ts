import { Document, Types } from "mongoose";
export declare class Product {
    shopId: Types.ObjectId;
    ownerId?: Types.ObjectId;
    title: string;
    description: string;
    price: number;
    category: Types.ObjectId;
    type: "retail" | "classified";
    images: string[];
    video: string;
    location: {
        type: "Point";
        coordinates: [number, number];
    };
    parameters?: Array<{
        name: string;
        variants: string[];
    }>;
    isDeleted: boolean;
    isDisabled?: boolean;
    address?: string;
    searchableTags: string[];
}
export declare const ProductSchema: import("mongoose").Schema<Product, import("mongoose").Model<Product, any, any, any, Document<unknown, any, Product, any> & Product & {
    _id: Types.ObjectId;
} & {
    __v: number;
}, any>, {}, {}, {}, {}, import("mongoose").DefaultSchemaOptions, Product, Document<unknown, {}, import("mongoose").FlatRecord<Product>, {}> & import("mongoose").FlatRecord<Product> & {
    _id: Types.ObjectId;
} & {
    __v: number;
}>;
export type ProductDocument = Product & Document;
