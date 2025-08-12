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
exports.ServicesService = void 0;
const common_1 = require("@nestjs/common");
const mongoose_1 = require("@nestjs/mongoose");
const services_schema_1 = require("./schema/services.schema");
const mongoose_2 = require("mongoose");
const listing_util_service_1 = require("../shared/listing-util-service");
const users_service_1 = require("../users/users.service");
const service_request_schema_1 = require("./schema/service_request.schema");
let ServicesService = class ServicesService {
    serviceModel;
    userService;
    listingUtils;
    requestModel;
    constructor(serviceModel, userService, listingUtils, requestModel) {
        this.serviceModel = serviceModel;
        this.userService = userService;
        this.listingUtils = listingUtils;
        this.requestModel = requestModel;
    }
    async create(userId, dto) {
        const user = await this.userService.findUserById(userId);
        if (!user) {
            throw new common_1.NotFoundException('user not found');
        }
        const created = await this.serviceModel.create({
            ...dto,
            ownerId: new mongoose_2.Types.ObjectId(userId),
            category: new mongoose_2.Types.ObjectId(dto.category),
            location: user.location,
        });
        return created.populate('category');
    }
    async update(serviceId, dto) {
        const updated = await this.serviceModel
            .findByIdAndUpdate(serviceId, {
            ...dto,
            ...(dto.category && { category: new mongoose_2.Types.ObjectId(dto.category) }),
        }, { new: true })
            .populate('category');
        if (!updated) {
            throw new common_1.NotFoundException('Service not found');
        }
        return updated;
    }
    async delete(serviceId) {
        const result = await this.serviceModel.findByIdAndDelete(serviceId);
        if (!result) {
            throw new common_1.NotFoundException('Service not found');
        }
    }
    async getById(serviceId) {
        const service = await this.serviceModel
            .findById(serviceId)
            .populate('category');
        if (!service) {
            throw new common_1.NotFoundException('Service not found');
        }
        return service;
    }
    async getByUser(userId, page = 1, limit = 10) {
        const skip = (page - 1) * limit;
        const [data, total] = await Promise.all([
            this.serviceModel
                .find({ ownerId: new mongoose_2.Types.ObjectId(userId) })
                .populate('category')
                .sort({ createdAt: -1 })
                .skip(skip)
                .limit(limit),
            this.serviceModel.countDocuments({ shopId: new mongoose_2.Types.ObjectId(userId) }),
        ]);
        return {
            meta: { total, page, limit, totalPages: Math.ceil(total / limit) },
            data: data,
        };
    }
    async searchNearbyWithCategory(category, coordinates, radius, pagination) {
        return this.listingUtils.findNearbyWithCategory(this.serviceModel, category, coordinates, radius, pagination);
    }
    async updateLocationByShopId(shopId, location) {
        await this.serviceModel.updateMany({ shopId }, { $set: { location } });
    }
    async searchServices(query) {
        const filter = {};
        if (query.name) {
            filter.title = { $regex: query.name, $options: 'i' };
        }
        if (query.category) {
            filter.category = new mongoose_2.Types.ObjectId(query.category);
        }
        const page = query.page && query.page > 0 ? query.page : 1;
        const limit = query.limit && query.limit > 0 ? query.limit : 10;
        const skip = (page - 1) * limit;
        const [results, total] = await Promise.all([
            this.serviceModel.find(filter).skip(skip).limit(limit).populate('category').exec(),
            this.serviceModel.countDocuments(filter),
        ]);
        return {
            meta: { total, page, limit, totalPages: Math.ceil(total / limit) },
            data: results,
        };
    }
    async createServiceRequest(dto) {
        const { serviceId, customerId, providerId, requestedDateTime, message, } = dto;
        const customer = customerId ? await this.userService.findUserById(customerId) : null;
        const provider = providerId ? await this.userService.findUserById(providerId) : null;
        if (customerId && !customer)
            throw new common_1.NotFoundException('Customer not found');
        if (providerId && !provider)
            throw new common_1.NotFoundException('Provider not found');
        if (!serviceId || !requestedDateTime || !customerId) {
            throw new common_1.BadRequestException('Missing required fields for request creation');
        }
        const service = await this.serviceModel.findById(serviceId);
        if (!service)
            throw new common_1.NotFoundException('Service not found');
        const request = new this.requestModel({
            service: serviceId,
            customer: customerId,
            provider: service.ownerId,
            requestedDateTime: new Date(requestedDateTime),
            status: 'pending',
            jobStatus: 'not_started',
            message,
        });
        return request.save();
    }
    async updateRequestStatus(dto) {
        const { requestId, action, proposedDateTime } = dto;
        const request = await this.requestModel.findById(requestId);
        if (!request)
            throw new common_1.NotFoundException('Request not found');
        switch (action) {
            case 'accept':
                request.status = 'accepted';
                break;
            case 'reject':
                request.status = 'rejected';
                break;
            case 'cancel':
                request.status = 'cancelled';
                break;
            case 'propose':
                if (!proposedDateTime)
                    throw new common_1.BadRequestException('Proposed date is required');
                request.status = 'proposed';
                request.proposedDateTime = new Date(proposedDateTime);
                break;
            default:
                throw new common_1.BadRequestException(`Unsupported action: ${action}`);
        }
        return request.save();
    }
    async updateJobStatus(dto) {
        const { requestId, action } = dto;
        const request = await this.requestModel.findById(requestId);
        if (!request)
            throw new common_1.NotFoundException('Request not found');
        switch (action) {
            case 'start_job':
                request.jobStatus = 'in_progress';
                request.status = 'accepted';
                break;
            case 'complete_job':
                request.jobStatus = 'completed';
                request.status = 'confirmed';
                break;
            default:
                throw new common_1.BadRequestException(`Unsupported job action: ${action}`);
        }
        return request.save();
    }
    async getServiceRequestsByUser(userId, page = 1, limit = 10) {
        const skip = (page - 1) * limit;
        const [requests, total] = await Promise.all([
            this.requestModel
                .find({
                $or: [
                    { customer: new mongoose_2.Types.ObjectId(userId) },
                    { provider: new mongoose_2.Types.ObjectId(userId) },
                ],
            })
                .populate('service')
                .populate('customer')
                .populate('provider')
                .sort({ createdAt: -1 })
                .skip(skip)
                .limit(limit)
                .exec(),
            this.requestModel.countDocuments({
                $or: [
                    { customer: new mongoose_2.Types.ObjectId(userId) },
                    { provider: new mongoose_2.Types.ObjectId(userId) },
                ],
            }),
        ]);
        if (!requests || requests.length === 0) {
            throw new common_1.NotFoundException('No service requests found for this user');
        }
        return {
            meta: {
                total,
                page,
                limit,
                totalPages: Math.ceil(total / limit),
            },
            data: requests,
        };
    }
};
exports.ServicesService = ServicesService;
exports.ServicesService = ServicesService = __decorate([
    (0, common_1.Injectable)(),
    __param(0, (0, mongoose_1.InjectModel)(services_schema_1.Service.name)),
    __param(1, (0, common_1.Inject)((0, common_1.forwardRef)(() => users_service_1.UsersService))),
    __param(3, (0, mongoose_1.InjectModel)(service_request_schema_1.ServiceRequest.name)),
    __metadata("design:paramtypes", [mongoose_2.Model,
        users_service_1.UsersService,
        listing_util_service_1.ListingUtilsService,
        mongoose_2.Model])
], ServicesService);
//# sourceMappingURL=services.service.js.map