import { Prop, SchemaFactory, Schema } from "@nestjs/mongoose";
import { Types } from "mongoose";
export type RequestStatus =
    | 'pending'       // User requested
    | 'accepted'      // Provider accepted
    | 'rejected'      // Provider rejected
    | 'proposed'      // Provider proposed new time
    | 'cancelled'     // User or provider cancelled
    | 'confirmed';    // User accepted proposed time

export type JobStatus =
    | 'not_started'   // Request is accepted/confirmed but work hasn't begun
    | 'in_progress'   // Provider marked job as started
    | 'completed'     // Job completed by provider
    | 'verified'      // User confirmed job completion
    | 'disputed';     // User raised an issue with the service

@Schema({ timestamps: true })
export class ServiceRequest {
    @Prop({ type: Types.ObjectId, ref: 'Service', required: true })
    service: Types.ObjectId;

    @Prop({ type: Types.ObjectId, ref: 'User', required: true })
    customer: Types.ObjectId;

    @Prop({ type: Types.ObjectId, ref: 'User', required: true })
    provider: Types.ObjectId;

    @Prop({ required: true })
    requestedDateTime: Date;

    @Prop()
    proposedDateTime?: Date;

    @Prop({
        required: true,
        enum: ['pending', 'accepted', 'rejected', 'proposed', 'cancelled', 'confirmed'],
        default: 'pending',
    })
    status: RequestStatus;

    @Prop({
        required: true,
        enum: ['not_started', 'in_progress', 'completed'],
        default: 'not_started'
    })
    jobStatus: JobStatus;

    @Prop({ trim: true })
    message?: string;
}

export const ServiceRequestSchema = SchemaFactory.createForClass(ServiceRequest);
export type ServiceRequestDocument = ServiceRequest & Document;