import { ServicesService } from "./services.service";
import { CreateServiceDto } from "./dto/create-service.dto";
import { UpdateServiceDto } from "./dto/update-service.dto";
import { PaginatedResponseDto } from "src/common/dto/pagination-response.dto";
import { Request } from "express";
import { CreateRequestDto } from "./dto/create-request-dto";
import { UpdateRequestStatusDto } from "./dto/update-request-dto";
import { UpdateJobStatusDto } from "./dto/update-job-dto";
import { UpdateServiceStatusDto } from "./dto/update-service-status.dto";
import { JwtPayload } from "src/auth/strategies/jwt-strategy";
import { GetWithVideosDto } from "./dto/video-with-dto";
import { PaginationDto } from "src/orders/dto/Get-paginated-dto";
import { SearchNearbyServiceDto } from "./dto/search-nearby-service.dto";
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
        status: number;
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
    }, currentUser: JwtPayload): Promise<{
        message: string;
        data: {
            images: string[];
            video: string;
            title?: string;
            description?: string;
            price?: number;
            paymentType?: "hourly" | "fixed" | "call_for_price";
            requiresAppointment?: boolean;
            category?: string;
            parameters?: import("./dto/create-service.dto").ServiceParameterDto[];
        };
    }>;
    delete(serviceId: string, currentUser: JwtPayload): Promise<{
        message: string;
    }>;
    getById(serviceId: string, userId?: string): Promise<any>;
    checkReviewEligibility(serviceId: string, userId?: string, currentUserId?: string): Promise<{
        data: {
            canReview: boolean;
            alreadyReviewed: boolean;
            notBooked?: undefined;
            notAccepted?: undefined;
            requestStatus?: undefined;
        };
        message: string;
    } | {
        data: {
            canReview: boolean;
            notBooked: boolean;
            alreadyReviewed?: undefined;
            notAccepted?: undefined;
            requestStatus?: undefined;
        };
        message: string;
    } | {
        data: {
            canReview: boolean;
            notAccepted: boolean;
            requestStatus: import("./schema/service_request.schema").RequestStatus;
            alreadyReviewed?: undefined;
            notBooked?: undefined;
        };
        message: string;
    } | {
        data: {
            canReview: boolean;
            alreadyReviewed?: undefined;
            notBooked?: undefined;
            notAccepted?: undefined;
            requestStatus?: undefined;
        };
        message: string;
    }>;
    getByUser(userId: string, page?: number, limit?: number): Promise<PaginatedResponseDto<any>>;
    getServiceRequestsByUser(userId: string, role: "customer" | "provider", page?: number, limit?: number, jobStatus?: string, status?: string): Promise<PaginatedResponseDto<any>>;
    getServicesByUserForAdmin(userId: string, page?: number, limit?: number): Promise<PaginatedResponseDto<any>>;
    getBookingsByUserForAdmin(userId: string, page?: number, limit?: number): Promise<PaginatedResponseDto<any>>;
    getAllServiceRequests(page?: number, limit?: number, search?: string, bookingStatus?: string, startDate?: string, endDate?: string): Promise<PaginatedResponseDto<any>>;
    getServiceRequestStatusCounts(startDate?: string, endDate?: string): Promise<{
        data: {
            pending: number;
            accepted: number;
            completed: number;
            cancelled: number;
            total: number;
        };
    }>;
    getServiceRequestDetail(requestId: string): Promise<{
        data: any;
    }>;
    getServicesWithVideos(query: GetWithVideosDto, userId?: string): Promise<PaginatedResponseDto<any>>;
    deleteProductMedia(serviceId: string, media: string[], currentUser: JwtPayload): Promise<{
        message: string;
    }>;
    getAllForAdmin(paginationDto: PaginationDto, search?: string): Promise<PaginatedResponseDto<any>>;
    updateServiceStatus(id: string, dto: UpdateServiceStatusDto): Promise<{
        message: string;
        data: import("mongoose").Document<unknown, {}, import("./schema/services.schema").ServiceDocument, {}> & import("./schema/services.schema").Service & import("mongoose").Document<unknown, any, any, Record<string, any>> & Required<{
            _id: unknown;
        }> & {
            __v: number;
        };
    }>;
    searchNearbyServices(query: SearchNearbyServiceDto): Promise<{
        meta: {
            total: any;
            page: number;
            limit: number;
            totalPages: number;
        };
        data: any[];
    }>;
    getServiceRequestsForCustomer(customerId: string, paginationDto: PaginationDto, jobStatus?: string, status?: string): Promise<PaginatedResponseDto<import("./schema/service_request.schema").ServiceRequest>>;
}
