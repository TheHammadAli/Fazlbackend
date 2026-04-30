import { ServicesService } from "./services.service";
import { CreateServiceDto } from "./dto/create-service.dto";
import { UpdateServiceDto } from "./dto/update-service.dto";
import { PaginatedResponseDto } from "src/common/dto/pagination-response.dto";
import { Request } from "express";
import { CreateRequestDto } from "./dto/create-request-dto";
import { UpdateRequestStatusDto } from "./dto/update-request-dto";
import { UpdateJobStatusDto } from "./dto/update-job-dto";
export declare class ServicesController {
    private readonly servicesService;
    constructor(servicesService: ServicesService);
    createRequest(dto: CreateRequestDto): Promise<import("mongoose").Document<unknown, {}, import("./schema/service_request.schema").ServiceRequestDocument, {}> & import("./schema/service_request.schema").ServiceRequest & Document & {
        _id: import("mongoose").Types.ObjectId;
    } & {
        __v: number;
    }>;
    updateStatus(dto: UpdateRequestStatusDto): Promise<{
        status: number;
        message: string;
        data: {
            requestId: string;
        };
    }>;
    updateJobStatus(dto: UpdateJobStatusDto): Promise<{
        message: string;
        data: {
            requestId: import("mongoose").Types.ObjectId;
            jobStatus: import("./schema/service_request.schema").JobStatus;
        };
    }>;
    create(req: Request, dto: CreateServiceDto, files: {
        images?: Express.Multer.File[];
        video?: Express.Multer.File[];
    }): Promise<import("./schema/services.schema").Service>;
    update(serviceId: string, dto: UpdateServiceDto, files: {
        images?: Express.Multer.File[];
        video?: Express.Multer.File[];
    }): Promise<{
        images: string[];
        video: string;
        title?: string;
        description?: string;
        price?: number;
        paymentType?: "hourly" | "fixed";
        requiresAppointment?: boolean;
        category?: string;
    }>;
    getById(serviceId: string): Promise<import("./schema/services.schema").Service>;
    getByUser(userId: string, page?: number, limit?: number): Promise<PaginatedResponseDto<any>>;
    getServiceRequestsByUser(userId: string, page?: number, limit?: number): Promise<PaginatedResponseDto<any>>;
    getServicesWithVideos(paginationDto: {
        page?: number;
        limit?: number;
    }, userId: string): Promise<PaginatedResponseDto<any>>;
    deleteProductMedia(serviceId: string, media: string[]): Promise<{
        message: string;
    }>;
}
