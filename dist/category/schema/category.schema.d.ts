import { Document } from "mongoose";
export declare enum CategoryType {
    SERVICE = "service",
    PRODUCT = "product"
}
export declare class Category {
    name: Map<string, string>;
    description?: Map<string, string>;
    parameters?: {
        en: Array<{
            name: string;
            values: string[];
        }>;
        ur: Array<{
            name: string;
            values: string[];
        }>;
    };
    sortNumber: number;
    isDisabled: boolean;
    icon?: string;
    type: CategoryType;
}
export type CategoryDocument = Category & Document;
export declare const CategorySchema: import("mongoose").Schema<Category, import("mongoose").Model<Category, any, any, any, Document<unknown, any, Category, any> & Category & {
    _id: import("mongoose").Types.ObjectId;
} & {
    __v: number;
}, any>, {}, {}, {}, {}, import("mongoose").DefaultSchemaOptions, Category, Document<unknown, {}, import("mongoose").FlatRecord<Category>, {}> & import("mongoose").FlatRecord<Category> & {
    _id: import("mongoose").Types.ObjectId;
} & {
    __v: number;
}>;
