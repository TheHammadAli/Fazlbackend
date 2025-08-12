import { Document, Types } from 'mongoose';
export type OrderStatus = 'pending' | 'confirmed' | 'shipped' | 'delivered' | 'cancelled';
export type paymentType = 'cashonDelivery' | 'Easypaisa';
export declare class Order {
    buyer: Types.ObjectId;
    owner: Types.ObjectId;
    ownerModel: string;
    product: Types.ObjectId;
    deliveryOption: 'self-pickup' | 'delivery';
    status: OrderStatus;
    paymentType: paymentType;
    amount: number;
    quantity: number;
}
export declare const OrderSchema: import("mongoose").Schema<Order, import("mongoose").Model<Order, any, any, any, Document<unknown, any, Order, any> & Order & {
    _id: Types.ObjectId;
} & {
    __v: number;
}, any>, {}, {}, {}, {}, import("mongoose").DefaultSchemaOptions, Order, Document<unknown, {}, import("mongoose").FlatRecord<Order>, {}> & import("mongoose").FlatRecord<Order> & {
    _id: Types.ObjectId;
} & {
    __v: number;
}>;
export type OrderDocument = Order & Document;
