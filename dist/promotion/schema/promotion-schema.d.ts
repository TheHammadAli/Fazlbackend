import mongoose, { Document, Types } from "mongoose";
export declare class Promotion extends Document {
    subscriptionId: Types.ObjectId;
    targetType: 'Product' | 'Shop' | 'Service';
    targetId: Types.ObjectId;
    startDate: Date;
    endDate: Date;
    status: 'active' | 'expired' | 'cancelled' | 'scheduled';
    isAutoRenew?: boolean;
    isInFeed?: boolean;
}
export declare const PromotionSchema: mongoose.Schema<Promotion, mongoose.Model<Promotion, any, any, any, mongoose.Document<unknown, any, Promotion, any> & Promotion & Required<{
    _id: unknown;
}> & {
    __v: number;
}, any>, {}, {}, {}, {}, mongoose.DefaultSchemaOptions, Promotion, mongoose.Document<unknown, {}, mongoose.FlatRecord<Promotion>, {}> & mongoose.FlatRecord<Promotion> & Required<{
    _id: unknown;
}> & {
    __v: number;
}>;
export type PromotionDocument = Promotion;
