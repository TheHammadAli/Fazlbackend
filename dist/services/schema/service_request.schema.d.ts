import { Types } from "mongoose";
export type RequestStatus = 'pending' | 'accepted' | 'rejected' | 'proposed' | 'cancelled' | 'confirmed';
export type JobStatus = 'not_started' | 'in_progress' | 'completed' | 'verified' | 'disputed';
export declare class ServiceRequest {
    service: Types.ObjectId;
    customer: Types.ObjectId;
    provider: Types.ObjectId;
    requestedDateTime: Date;
    proposedDateTime?: Date;
    status: RequestStatus;
    jobStatus: JobStatus;
    message?: string;
    completedAt?: Date;
    startedAt?: Date;
}
export declare const ServiceRequestSchema: import("mongoose").Schema<ServiceRequest, import("mongoose").Model<ServiceRequest, any, any, any, import("mongoose").Document<unknown, any, ServiceRequest, any> & ServiceRequest & {
    _id: Types.ObjectId;
} & {
    __v: number;
}, any>, {}, {}, {}, {}, import("mongoose").DefaultSchemaOptions, ServiceRequest, import("mongoose").Document<unknown, {}, import("mongoose").FlatRecord<ServiceRequest>, {}> & import("mongoose").FlatRecord<ServiceRequest> & {
    _id: Types.ObjectId;
} & {
    __v: number;
}>;
export type ServiceRequestDocument = ServiceRequest & Document;
