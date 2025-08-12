import { Document } from 'mongoose';
import mongoose, { Types } from 'mongoose';
export type CategoryRequestDocument = CategoryRequest & Document;
export declare class CategoryRequest {
    name: string;
    description?: string;
    requestedBy: Types.ObjectId;
    status: 'pending' | 'approved' | 'rejected';
    reviewedBy?: Types.ObjectId;
    adminComment?: string;
    createdAt: Date;
    reviewedAt?: Date;
}
export declare const CategoryRequestSchema: mongoose.Schema<CategoryRequest, mongoose.Model<CategoryRequest, any, any, any, Document<unknown, any, CategoryRequest, any> & CategoryRequest & {
    _id: Types.ObjectId;
} & {
    __v: number;
}, any>, {}, {}, {}, {}, mongoose.DefaultSchemaOptions, CategoryRequest, Document<unknown, {}, mongoose.FlatRecord<CategoryRequest>, {}> & mongoose.FlatRecord<CategoryRequest> & {
    _id: Types.ObjectId;
} & {
    __v: number;
}>;
