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
    async create(userId, dto) {
        return await this.servicesService.create(userId, dto);
    }
    async update(serviceId, dto) {
        return await this.servicesService.update(serviceId, dto);
    }
    async delete(serviceId) {
        return await this.servicesService.delete(serviceId);
    }
    async getById(serviceId) {
        return await this.servicesService.getById(serviceId);
    }
    async getByUser(userId, page = 1, limit = 10) {
        return this.servicesService.getByUser(userId, page, limit);
    }
    async getServiceRequestsByUser(userId, page = 1, limit = 10) {
        return this.servicesService.getByUser(userId, page, limit);
    }
};
exports.ServicesController = ServicesController;
__decorate([
    (0, common_1.Post)('create-request'),
    (0, swagger_1.ApiOperation)({ summary: 'Create a new service request' }),
    (0, swagger_1.ApiBody)({ type: create_request_dto_1.CreateRequestDto }),
    __param(0, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [create_request_dto_1.CreateRequestDto]),
    __metadata("design:returntype", void 0)
], ServicesController.prototype, "createRequest", null);
__decorate([
    (0, common_1.Patch)('status'),
    (0, swagger_1.ApiOperation)({ summary: 'Update the status of a request (accept, reject, cancel, confirm, propose)' }),
    (0, swagger_1.ApiBody)({ type: update_request_dto_1.UpdateRequestStatusDto }),
    __param(0, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [update_request_dto_1.UpdateRequestStatusDto]),
    __metadata("design:returntype", void 0)
], ServicesController.prototype, "updateStatus", null);
__decorate([
    (0, common_1.Patch)('job-status'),
    (0, swagger_1.ApiOperation)({ summary: 'Update the job status of a request (start_job, complete_job)' }),
    (0, swagger_1.ApiBody)({ type: update_job_dto_1.UpdateJobStatusDto }),
    __param(0, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [update_job_dto_1.UpdateJobStatusDto]),
    __metadata("design:returntype", void 0)
], ServicesController.prototype, "updateJobStatus", null);
__decorate([
    (0, common_1.Post)(':userId'),
    (0, swagger_1.ApiOperation)({ summary: 'Create a new service for a user' }),
    (0, swagger_1.ApiParam)({ name: 'userId', required: true }),
    (0, swagger_1.ApiResponse)({ status: 201, description: 'Service created successfully' }),
    __param(0, (0, common_1.Param)('userId')),
    __param(1, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, create_service_dto_1.CreateServiceDto]),
    __metadata("design:returntype", Promise)
], ServicesController.prototype, "create", null);
__decorate([
    (0, common_1.Put)(':serviceId'),
    (0, swagger_1.ApiOperation)({ summary: 'Update an existing service' }),
    (0, swagger_1.ApiParam)({ name: 'serviceId', required: true }),
    (0, swagger_1.ApiResponse)({ status: 200, description: 'Service updated successfully' }),
    __param(0, (0, common_1.Param)('serviceId')),
    __param(1, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, update_service_dto_1.UpdateServiceDto]),
    __metadata("design:returntype", Promise)
], ServicesController.prototype, "update", null);
__decorate([
    (0, common_1.Delete)(':serviceId'),
    (0, swagger_1.ApiOperation)({ summary: 'Delete a service' }),
    (0, swagger_1.ApiParam)({ name: 'serviceId', required: true }),
    (0, swagger_1.ApiResponse)({ status: 204, description: 'Service deleted successfully' }),
    (0, common_1.HttpCode)(common_1.HttpStatus.NO_CONTENT),
    __param(0, (0, common_1.Param)('serviceId')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", Promise)
], ServicesController.prototype, "delete", null);
__decorate([
    (0, common_1.Get)(':serviceId'),
    (0, swagger_1.ApiOperation)({ summary: 'Get service by ID' }),
    (0, swagger_1.ApiParam)({ name: 'serviceId', required: true }),
    (0, swagger_1.ApiResponse)({ status: 200, description: 'Service found' }),
    __param(0, (0, common_1.Param)('serviceId')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", Promise)
], ServicesController.prototype, "getById", null);
__decorate([
    (0, common_1.Get)('/user/:userId'),
    (0, swagger_1.ApiOperation)({ summary: 'Get paginated services by user ID' }),
    (0, swagger_1.ApiParam)({ name: 'userId', required: true }),
    (0, swagger_1.ApiQuery)({ name: 'page', required: false, type: Number }),
    (0, swagger_1.ApiQuery)({ name: 'limit', required: false, type: Number }),
    (0, swagger_1.ApiResponse)({
        status: 200,
        description: 'Paginated list of services',
    }),
    __param(0, (0, common_1.Param)('userId')),
    __param(1, (0, common_1.Query)('page')),
    __param(2, (0, common_1.Query)('limit')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Number, Number]),
    __metadata("design:returntype", Promise)
], ServicesController.prototype, "getByUser", null);
__decorate([
    (0, common_1.Get)('/requests/:userId'),
    (0, swagger_1.ApiOperation)({ summary: 'Get paginated services by user ID' }),
    (0, swagger_1.ApiParam)({ name: 'userId', required: true }),
    (0, swagger_1.ApiQuery)({ name: 'page', required: false, type: Number }),
    (0, swagger_1.ApiQuery)({ name: 'limit', required: false, type: Number }),
    (0, swagger_1.ApiResponse)({
        status: 200,
        description: 'Paginated list of services',
    }),
    __param(0, (0, common_1.Param)('userId')),
    __param(1, (0, common_1.Query)('page')),
    __param(2, (0, common_1.Query)('limit')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Number, Number]),
    __metadata("design:returntype", Promise)
], ServicesController.prototype, "getServiceRequestsByUser", null);
exports.ServicesController = ServicesController = __decorate([
    (0, swagger_1.ApiTags)('Services'),
    (0, swagger_1.ApiBearerAuth)('jwt'),
    (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard),
    (0, common_1.Controller)('services'),
    __metadata("design:paramtypes", [services_service_1.ServicesService])
], ServicesController);
//# sourceMappingURL=services.controller.js.map