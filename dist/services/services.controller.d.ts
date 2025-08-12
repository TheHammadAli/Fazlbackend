import { ServicesService } from './services.service';
import { CreateServiceDto } from './dto/create-service.dto';
import { UpdateServiceDto } from './dto/update-service.dto';
import { PaginatedResponseDto } from 'src/common/dto/pagination-response.dto';
import { CreateRequestDto } from './dto/create-request-dto';
import { UpdateRequestStatusDto } from './dto/update-request-dto';
import { UpdateJobStatusDto } from './dto/update-job-dto';
export declare class ServicesController {
    private readonly servicesService;
    constructor(servicesService: ServicesService);
    createRequest(dto: CreateRequestDto): Promise<import("mongoose").Document<unknown, {}, import("./schema/service_request.schema").ServiceRequestDocument, {}> & import("./schema/service_request.schema").ServiceRequest & Document & {
        _id: import("mongoose").Types.ObjectId;
    } & {
        __v: number;
    }>;
    updateStatus(dto: UpdateRequestStatusDto): Promise<import("mongoose").Document<unknown, {}, import("./schema/service_request.schema").ServiceRequestDocument, {}> & import("./schema/service_request.schema").ServiceRequest & Document & {
        _id: import("mongoose").Types.ObjectId;
    } & {
        __v: number;
    }>;
    updateJobStatus(dto: UpdateJobStatusDto): Promise<import("mongoose").Document<unknown, {}, import("./schema/service_request.schema").ServiceRequestDocument, {}> & import("./schema/service_request.schema").ServiceRequest & Document & {
        _id: import("mongoose").Types.ObjectId;
    } & {
        __v: number;
    }>;
    create(userId: string, dto: CreateServiceDto): Promise<import("./schema/services.schema").Service>;
    update(serviceId: string, dto: UpdateServiceDto): Promise<import("./schema/services.schema").Service>;
    delete(serviceId: string): Promise<void>;
    getById(serviceId: string): Promise<import("./schema/services.schema").Service>;
    getByUser(userId: string, page?: number, limit?: number): Promise<PaginatedResponseDto<any>>;
    getServiceRequestsByUser(userId: string, page?: number, limit?: number): Promise<PaginatedResponseDto<any>>;
}
