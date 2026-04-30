import { Service, ServiceDocument } from "./schema/services.schema";
import { Model, Types } from "mongoose";
import { I18nService } from "nestjs-i18n";
import { CreateServiceDto } from "./dto/create-service.dto";
import { UpdateServiceDto } from "./dto/update-service.dto";
import { PaginatedResponseDto } from "src/common/dto/pagination-response.dto";
import { PaginationDto } from "src/common/dto/pagination.dto";
import { ListingUtilsService } from "src/shared/listing-util-service";
import { UsersService } from "src/users/users.service";
import { ServiceRequest, ServiceRequestDocument } from "./schema/service_request.schema";
import { SearchAllProductsServiceDto } from "src/search/dto/product-service-search-for.dto";
import { UpdateJobStatusDto } from "./dto/update-job-dto";
import { UpdateRequestStatusDto } from "./dto/update-request-dto";
import { CreateRequestDto } from "./dto/create-request-dto";
import { NotificationsService } from "src/notifications/notifications.service";
import { FileUploadService } from "src/common/file-upload/file-upload.service";
import { ClsService } from "nestjs-cls";
export declare class ServicesService {
    private readonly serviceModel;
    private readonly userService;
    private readonly notificationsService;
    private readonly listingUtils;
    private readonly fileUploadService;
    private readonly requestModel;
    private readonly i18n;
    private readonly cls;
    constructor(serviceModel: Model<ServiceDocument>, userService: UsersService, notificationsService: NotificationsService, listingUtils: ListingUtilsService, fileUploadService: FileUploadService, requestModel: Model<ServiceRequestDocument>, i18n: I18nService, cls: ClsService);
    private get lang();
    getServiceModel(): Model<ServiceDocument>;
    create(userId: string, dto: CreateServiceDto, lang?: string): Promise<Service>;
    update(serviceId: string, dto: UpdateServiceDto): Promise<{
        images: string[];
        video: string;
        title?: string;
        description?: string;
        price?: number;
        paymentType?: "hourly" | "fixed";
        requiresAppointment?: boolean;
        category?: string;
    }>;
    delete(serviceId: string): Promise<void>;
    deleteServiceMedia(serviceId: string, media: string[]): Promise<boolean>;
    getById(serviceId: string): Promise<Service>;
    getByUser(userId: string, page?: number, limit?: number): Promise<PaginatedResponseDto<Service>>;
    searchNearbyWithCategory(category: string, coordinates: [number, number], radius: number, pagination: PaginationDto): Promise<PaginatedResponseDto<ServiceDocument>>;
    updateLocationByShopId(shopId: string, location: {
        type: "Point";
        coordinates: [number, number];
    }): Promise<void>;
    searchServices(query: SearchAllProductsServiceDto): Promise<{
        meta: {
            total: number;
            page: number;
            limit: number;
            totalPages: number;
        };
        data: (import("mongoose").Document<unknown, {}, ServiceDocument, {}> & Service & import("mongoose").Document<unknown, any, any, Record<string, any>> & Required<{
            _id: unknown;
        }> & {
            __v: number;
        })[];
    }>;
    createServiceRequest(dto: CreateRequestDto): Promise<import("mongoose").Document<unknown, {}, ServiceRequestDocument, {}> & ServiceRequest & Document & {
        _id: Types.ObjectId;
    } & {
        __v: number;
    }>;
    updateRequestStatus(dto: UpdateRequestStatusDto): Promise<{
        status: number;
        message: string;
        data: {
            requestId: string;
        };
    }>;
    updateJobStatus(dto: UpdateJobStatusDto): Promise<{
        message: string;
        data: {
            requestId: Types.ObjectId;
            jobStatus: import("./schema/service_request.schema").JobStatus;
        };
    }>;
    getServiceRequestsByUser(userId: string, page?: number, limit?: number): Promise<PaginatedResponseDto<ServiceRequest>>;
    deleteAllServiceMedia(serviceId: string, media: string[]): Promise<{
        message: string;
    }>;
    getServicesWithVideos(paginationDto: PaginationDto): Promise<PaginatedResponseDto<Service>>;
}
