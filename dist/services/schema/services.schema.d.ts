import { Document, Types } from 'mongoose';
export declare class Service {
    ownerId: Types.ObjectId;
    title: string;
    description?: string;
    price: number;
    paymentType: 'hourly' | 'fixed';
    requiresAppointment: boolean;
    images: string[];
    category: Types.ObjectId;
    location: {
        type: 'Point';
        coordinates: [number, number];
    };
    video: string;
}
export declare const ServiceSchema: import("mongoose").Schema<Service, import("mongoose").Model<Service, any, any, any, Document<unknown, any, Service, any> & Service & {
    _id: Types.ObjectId;
} & {
    __v: number;
}, any>, {}, {}, {}, {}, import("mongoose").DefaultSchemaOptions, Service, Document<unknown, {}, import("mongoose").FlatRecord<Service>, {}> & import("mongoose").FlatRecord<Service> & {
    _id: Types.ObjectId;
} & {
    __v: number;
}>;
export type ServiceDocument = Service & Document;
