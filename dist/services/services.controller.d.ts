import { ServicesService } from "./services.service";
import { CreateServiceDto } from "./dto/create-service.dto";
import { UpdateServiceDto } from "./dto/update-service.dto";
import { PaginatedResponseDto } from "src/common/dto/pagination-response.dto";
import { Request } from "express";
import { CreateRequestDto } from "./dto/create-request-dto";
import { UpdateRequestStatusDto } from "./dto/update-request-dto";
import { UpdateJobStatusDto } from "./dto/update-job-dto";
import { GetWithVideosDto } from "./dto/video-with-dto";
import { PaginationDto } from "src/orders/dto/Get-paginated-dto";
export declare class ServicesController {
    private readonly servicesService;
    constructor(servicesService: ServicesService);
    createRequest(dto: CreateRequestDto): Promise<{
        data: import("mongoose").Document<unknown, {}, import("./schema/service_request.schema").ServiceRequestDocument, {}> & import("./schema/service_request.schema").ServiceRequest & Document & {
            _id: import("mongoose").Types.ObjectId;
        } & {
            __v: number;
        };
        message: string;
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
    }): Promise<{
        message: string;
        data: Promise<Omit<import("mongoose").Document<unknown, {}, import("./schema/services.schema").ServiceDocument, {}> & import("./schema/services.schema").Service & import("mongoose").Document<unknown, any, any, Record<string, any>> & Required<{
            _id: unknown;
        }> & {
            __v: number;
        }, never>>;
    }>;
    update(serviceId: string, dto: UpdateServiceDto, files: {
        images?: Express.Multer.File[];
        video?: Express.Multer.File[];
    }): Promise<{
        message: string;
        data: {
            images: string[];
            video: string;
            title?: string;
            description?: string;
            price?: number;
            paymentType?: "hourly" | "fixed";
            requiresAppointment?: boolean;
            category?: string;
        };
    }>;
    getById(serviceId: string): Promise<import("./schema/services.schema").Service>;
    getByUser(userId: string, page?: number, limit?: number): Promise<PaginatedResponseDto<any>>;
    getServiceRequestsByUser(userId: string, page?: number, limit?: number): Promise<PaginatedResponseDto<any>>;
    getServicesWithVideos(query: GetWithVideosDto, userId: string): Promise<PaginatedResponseDto<any>>;
    deleteProductMedia(serviceId: string, media: string[]): Promise<{
        message: string;
    }>;
    getServiceRequestsForCustomer(customerId: string, paginationDto: PaginationDto): Promise<PaginatedResponseDto<import("./schema/service_request.schema").ServiceRequest>>;
}
