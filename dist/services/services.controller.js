"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
var __param = (this && this.__param) || function (paramIndex, decorator) {
    return function (target, key) { decorator(target, key, paramIndex); }
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.ServicesController = void 0;
const common_1 = require("@nestjs/common");
const services_service_1 = require("./services.service");
const create_service_dto_1 = require("./dto/create-service.dto");
const update_service_dto_1 = require("./dto/update-service.dto");
const jwt_auth_guard_1 = require("../auth/guard/jwt-auth-guard");
const swagger_1 = require("@nestjs/swagger");
const create_request_dto_1 = require("./dto/create-request-dto");
const update_request_dto_1 = require("./dto/update-request-dto");
const update_job_dto_1 = require("./dto/update-job-dto");
const platform_express_1 = require("@nestjs/platform-express");
const current_user_decorator_1 = require("../common/decorators/current-user.decorator");
const public_decorator_1 = require("../common/decorators/public.decorator");
const video_with_dto_1 = require("./dto/video-with-dto");
const Get_paginated_dto_1 = require("../orders/dto/Get-paginated-dto");
let ServicesController = class ServicesController {
    servicesService;
    constructor(servicesService) {
        this.servicesService = servicesService;
    }
    createRequest(dto) {
        return this.servicesService.createServiceRequest(dto);
    }
    updateStatus(dto) {
        return this.servicesService.updateRequestStatus(dto);
    }
    updateJobStatus(dto) {
        return this.servicesService.updateJobStatus(dto);
    }
    async create(req, dto, files) {
        const user = req.user;
        if (files?.images && files.images.length > 0) {
            dto.images = files.images;
        }
        else {
            dto.images = [];
        }
        if (files?.video && files.video.length > 0) {
            dto.video = files.video;
        }
        else {
            dto.video = [];
        }
        return await this.servicesService.create(user.sub, dto);
    }
    async update(serviceId, dto, files) {
        if (files?.images && files.images.length > 0) {
            dto.images = files.images;
        }
        if (files?.video && files.video.length > 0) {
            dto.video = files.video;
        }
        return await this.servicesService.update(serviceId, dto);
    }
    async delete(serviceId) {
        const results = await this.servicesService.delete(serviceId);
        console.log("Results", results);
        return { message: results.message };
    }
    async getById(serviceId) {
        return await this.servicesService.getById(serviceId);
    }
    async getByUser(userId, page = 1, limit = 10) {
        return this.servicesService.getByUser(userId, page, limit);
    }
    async getServiceRequestsByUser(userId, page = 1, limit = 10) {
        return this.servicesService.getServiceRequestsByUser(userId, page, limit);
    }
    async getServicesWithVideos(query, userId) {
        console.log("Recieved pagination", query);
        return this.servicesService.getServicesWithVideos(query, userId, query.category);
    }
    async deleteProductMedia(serviceId, media) {
        if (!Array.isArray(media) || media.length === 0) {
            throw new common_1.BadRequestException("No media files provided for deletion");
        }
        await this.servicesService.deleteServiceMedia(serviceId, media);
        return { message: "Selected service media deleted successfully" };
    }
    async deleteService(serviceId) {
        await this.servicesService.delete(serviceId);
        return { message: "Selected service deleted successfully" };
    }
    async getServiceRequestsForCustomer(customerId, paginationDto) {
        return this.servicesService.getServicesRequestsForCustomer(customerId, paginationDto);
    }
};
exports.ServicesController = ServicesController;
__decorate([
    (0, common_1.Post)("create-request"),
    (0, swagger_1.ApiOperation)({ summary: "Create a new service request" }),
    (0, swagger_1.ApiBody)({ type: create_request_dto_1.CreateRequestDto }),
    __param(0, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [create_request_dto_1.CreateRequestDto]),
    __metadata("design:returntype", void 0)
], ServicesController.prototype, "createRequest", null);
__decorate([
    (0, common_1.Patch)("status"),
    (0, swagger_1.ApiOperation)({
        summary: "Update the status of a request (accept, reject, cancel, confirm, propose)",
    }),
    (0, swagger_1.ApiBody)({ type: update_request_dto_1.UpdateRequestStatusDto }),
    __param(0, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [update_request_dto_1.UpdateRequestStatusDto]),
    __metadata("design:returntype", void 0)
], ServicesController.prototype, "updateStatus", null);
__decorate([
    (0, common_1.Patch)("job-status"),
    (0, swagger_1.ApiOperation)({
        summary: "Update the job status of a request (start_job, complete_job)",
    }),
    (0, swagger_1.ApiBody)({ type: update_job_dto_1.UpdateJobStatusDto }),
    __param(0, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [update_job_dto_1.UpdateJobStatusDto]),
    __metadata("design:returntype", void 0)
], ServicesController.prototype, "updateJobStatus", null);
__decorate([
    (0, common_1.Post)("create"),
    (0, swagger_1.ApiOperation)({ summary: "Create a new service for a user" }),
    (0, swagger_1.ApiConsumes)("multipart/form-data"),
    (0, common_1.UseInterceptors)((0, platform_express_1.FileFieldsInterceptor)([
        { name: "images", maxCount: 5 },
        { name: "video", maxCount: 1 },
    ])),
    (0, swagger_1.ApiBody)({ type: create_service_dto_1.CreateServiceDto }),
    (0, swagger_1.ApiResponse)({ status: 201, description: "Service created successfully" }),
    __param(0, (0, common_1.Req)()),
    __param(1, (0, common_1.Body)()),
    __param(2, (0, common_1.UploadedFiles)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, create_service_dto_1.CreateServiceDto, Object]),
    __metadata("design:returntype", Promise)
], ServicesController.prototype, "create", null);
__decorate([
    (0, common_1.Put)("update/:serviceId"),
    (0, swagger_1.ApiOperation)({ summary: "Update an existing service" }),
    (0, swagger_1.ApiParam)({ name: "serviceId", required: true }),
    (0, swagger_1.ApiResponse)({ status: 200, description: "Service updated successfully" }),
    (0, swagger_1.ApiConsumes)("multipart/form-data"),
    (0, common_1.UseInterceptors)((0, platform_express_1.FileFieldsInterceptor)([
        { name: "images", maxCount: 5 },
        { name: "video", maxCount: 1 },
    ])),
    (0, swagger_1.ApiBody)({ type: update_service_dto_1.UpdateServiceDto }),
    __param(0, (0, common_1.Param)("serviceId")),
    __param(1, (0, common_1.Body)()),
    __param(2, (0, common_1.UploadedFiles)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, update_service_dto_1.UpdateServiceDto, Object]),
    __metadata("design:returntype", Promise)
], ServicesController.prototype, "update", null);
__decorate([
    (0, common_1.Delete)(':serviceId'),
    (0, swagger_1.ApiOperation)({ summary: 'Delete a service' }),
    (0, swagger_1.ApiParam)({ name: 'serviceId', required: true }),
    (0, swagger_1.ApiResponse)({ status: 204, description: 'Service deleted successfully' }),
    (0, common_1.HttpCode)(common_1.HttpStatus.OK),
    __param(0, (0, common_1.Param)('serviceId')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", Promise)
], ServicesController.prototype, "delete", null);
__decorate([
    (0, public_decorator_1.Public)(),
    (0, common_1.Get)(":serviceId"),
    (0, swagger_1.ApiOperation)({ summary: "Get service by ID" }),
    (0, swagger_1.ApiParam)({ name: "serviceId", required: true }),
    (0, swagger_1.ApiResponse)({ status: 200, description: "Service found" }),
    __param(0, (0, common_1.Param)("serviceId")),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", Promise)
], ServicesController.prototype, "getById", null);
__decorate([
    (0, common_1.Get)("/user/:userId"),
    (0, public_decorator_1.Public)(),
    (0, swagger_1.ApiOperation)({ summary: "Get paginated services by user ID" }),
    (0, swagger_1.ApiParam)({ name: "userId", required: true }),
    (0, swagger_1.ApiQuery)({ name: "page", required: false, type: Number }),
    (0, swagger_1.ApiQuery)({ name: "limit", required: false, type: Number }),
    (0, swagger_1.ApiResponse)({
        status: 200,
        description: "Paginated list of services",
    }),
    __param(0, (0, common_1.Param)("userId")),
    __param(1, (0, common_1.Query)("page")),
    __param(2, (0, common_1.Query)("limit")),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Number, Number]),
    __metadata("design:returntype", Promise)
], ServicesController.prototype, "getByUser", null);
__decorate([
    (0, common_1.Get)("/requests/:userId"),
    (0, swagger_1.ApiOperation)({ summary: "Get paginated services by user ID" }),
    (0, swagger_1.ApiParam)({ name: "userId", required: true }),
    (0, swagger_1.ApiQuery)({ name: "page", required: false, type: Number }),
    (0, swagger_1.ApiQuery)({ name: "limit", required: false, type: Number }),
    (0, swagger_1.ApiResponse)({
        status: 200,
        description: "Paginated list of services",
    }),
    __param(0, (0, common_1.Param)("userId")),
    __param(1, (0, common_1.Query)("page")),
    __param(2, (0, common_1.Query)("limit")),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Number, Number]),
    __metadata("design:returntype", Promise)
], ServicesController.prototype, "getServiceRequestsByUser", null);
__decorate([
    (0, public_decorator_1.Public)(),
    (0, common_1.Get)("with-videos/all"),
    (0, swagger_1.ApiOperation)({ summary: "Get all services with videos (paginated)" }),
    (0, swagger_1.ApiResponse)({
        status: 200,
        description: "Paginated list of services with videos",
    }),
    __param(0, (0, common_1.Query)()),
    __param(1, (0, current_user_decorator_1.CurrentUser)("sub")),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [video_with_dto_1.GetWithVideosDto, String]),
    __metadata("design:returntype", Promise)
], ServicesController.prototype, "getServicesWithVideos", null);
__decorate([
    (0, common_1.Delete)(":id/media"),
    (0, swagger_1.ApiOperation)({ summary: "Delete selected media files for a service" }),
    (0, swagger_1.ApiParam)({ name: "id", description: "Service ID" }),
    (0, swagger_1.ApiBody)({
        schema: {
            properties: {
                media: {
                    type: "array",
                    items: { type: "string" },
                    description: "Array of media file URLs to delete",
                },
            },
            required: ["media"],
        },
    }),
    (0, swagger_1.ApiResponse)({
        status: 200,
        description: "Selected service media deleted successfully",
    }),
    (0, swagger_1.ApiResponse)({ status: 404, description: "Service not found" }),
    (0, swagger_1.ApiResponse)({
        status: 400,
        description: "No media files provided for deletion",
    }),
    (0, common_1.HttpCode)(common_1.HttpStatus.OK),
    __param(0, (0, common_1.Param)("id")),
    __param(1, (0, common_1.Body)("media")),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Array]),
    __metadata("design:returntype", Promise)
], ServicesController.prototype, "deleteProductMedia", null);
__decorate([
    (0, common_1.Delete)(":id/media"),
    (0, swagger_1.ApiOperation)({ summary: "Delete selected media files for a service" }),
    (0, swagger_1.ApiParam)({ name: "id", description: "Service ID" }),
    (0, swagger_1.ApiBody)({
        schema: {
            properties: {
                media: {
                    type: "array",
                    items: { type: "string" },
                    description: "Array of media file URLs to delete",
                },
            },
            required: ["media"],
        },
    }),
    (0, swagger_1.ApiResponse)({
        status: 200,
        description: "Selected service deleted successfully",
    }),
    (0, swagger_1.ApiResponse)({ status: 404, description: "Service not found" }),
    (0, common_1.HttpCode)(common_1.HttpStatus.OK),
    __param(0, (0, common_1.Param)("id")),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", Promise)
], ServicesController.prototype, "deleteService", null);
__decorate([
    (0, common_1.Get)("/customer/:customerId"),
    (0, swagger_1.ApiOperation)({ summary: "Get paginated services for a customer" }),
    (0, swagger_1.ApiParam)({ name: "customerId", required: true }),
    (0, swagger_1.ApiQuery)({ name: "page", required: false, type: Number }),
    (0, swagger_1.ApiQuery)({ name: "limit", required: false, type: Number }),
    (0, swagger_1.ApiResponse)({
        status: 200,
        description: "Paginated list of services for the customer",
    }),
    __param(0, (0, common_1.Param)("customerId")),
    __param(1, (0, common_1.Query)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Get_paginated_dto_1.PaginationDto]),
    __metadata("design:returntype", Promise)
], ServicesController.prototype, "getServiceRequestsForCustomer", null);
exports.ServicesController = ServicesController = __decorate([
    (0, swagger_1.ApiTags)("Services"),
    (0, swagger_1.ApiBearerAuth)("jwt"),
    (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard),
    (0, common_1.Controller)("services"),
    __metadata("design:paramtypes", [services_service_1.ServicesService])
], ServicesController);
//# sourceMappingURL=services.controller.js.map