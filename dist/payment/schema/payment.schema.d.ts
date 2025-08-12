import { Document, Types } from 'mongoose';
export type PaymentDocument = Payment & Document;
export declare class Payment {
    userId: Types.ObjectId;
    itemId: Types.ObjectId;
    itemType: 'product' | 'service';
    amount: number;
    status: 'pending' | 'success' | 'failed' | 'cancelled';
    transactionId?: string;
    paymentUrl?: string;
    provider?: string;
    isRefunded: boolean;
    refundDate?: Date;
    paidAt?: Date;
}
export declare const PaymentSchema: import("mongoose").Schema<Payment, import("mongoose").Model<Payment, any, any, any, Document<unknown, any, Payment, any> & Payment & {
    _id: Types.ObjectId;
} & {
    __v: number;
}, any>, {}, {}, {}, {}, import("mongoose").DefaultSchemaOptions, Payment, Document<unknown, {}, import("mongoose").FlatRecord<Payment>, {}> & import("mongoose").FlatRecord<Payment> & {
    _id: Types.ObjectId;
} & {
    __v: number;
}>;
