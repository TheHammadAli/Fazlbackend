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
const nestjs_i18n_1 = require("nestjs-i18n");
const listing_util_service_1 = require("../shared/listing-util-service");
const users_service_1 = require("../users/users.service");
const service_request_schema_1 = require("./schema/service_request.schema");
const notifications_service_1 = require("../notifications/notifications.service");
const file_upload_service_1 = require("../common/file-upload/file-upload.service");
const nestjs_cls_1 = require("nestjs-cls");
let ServicesService = class ServicesService {
    serviceModel;
    userService;
    notificationsService;
    listingUtils;
    fileUploadService;
    requestModel;
    i18n;
    cls;
    constructor(serviceModel, userService, notificationsService, listingUtils, fileUploadService, requestModel, i18n, cls) {
        this.serviceModel = serviceModel;
        this.userService = userService;
        this.notificationsService = notificationsService;
        this.listingUtils = listingUtils;
        this.fileUploadService = fileUploadService;
        this.requestModel = requestModel;
        this.i18n = i18n;
        this.cls = cls;
    }
    get lang() {
        return this.cls?.get("lang") ?? "en";
    }
    getServiceModel() {
        return this.serviceModel;
    }
    async create(userId, dto, lang = "en") {
        const user = await this.userService.findUserById(userId);
        if (!user) {
            throw new common_1.NotFoundException(this.i18n.translate("services.user_not_found", { lang: this.lang }));
        }
        const existingService = await this.serviceModel.findOne({
            ownerId: user._id,
        });
        if (existingService) {
            throw new common_1.BadRequestException(this.i18n.translate("services.user_duplicate_service", {
                lang: this.lang,
            }));
        }
        if (!user.location ||
            !user.location.coordinates ||
            user.location.coordinates.length !== 2) {
            throw new common_1.BadRequestException(this.i18n.translate("services.user_location_missing", {
                lang: this.lang,
            }));
        }
        let images = [];
        let imageFiles = [];
        let videoFiles = [];
        if (dto.images) {
            imageFiles = dto.images;
        }
        if (imageFiles.length > 5) {
            throw new common_1.BadRequestException(this.i18n.translate("services.media_limit_exceeded", {
                lang: this.lang,
            }));
        }
        if (dto.video) {
            videoFiles = dto.video;
        }
        const created = await this.serviceModel.create({
            ...dto,
            ownerId: new mongoose_2.Types.ObjectId(userId),
            category: new mongoose_2.Types.ObjectId(dto.category),
            location: user.location,
            images: [],
            video: "",
        });
        if (imageFiles && imageFiles.length > 0) {
            images = await this.fileUploadService.uploadServiceFile(userId, created._id.toString(), imageFiles);
            created.images = images;
        }
        if (videoFiles && videoFiles.length > 0) {
            const video = await this.fileUploadService.uploadServiceFile(userId, created._id.toString(), videoFiles, "video");
            created.video = video[0];
        }
        await created.save();
        return created.populate("category");
    }
    async update(serviceId, dto) {
        Object.keys(dto).forEach((key) => {
            if (dto[key] === "" ||
                dto[key] === null ||
                typeof dto[key] === "undefined") {
                delete dto[key];
            }
        });
        const existingService = await this.serviceModel.findById(serviceId);
        if (!existingService) {
            throw new common_1.NotFoundException("Service not found");
        }
        const imageFiles = dto.images;
        let images = existingService.images;
        if (imageFiles && imageFiles.length > 0) {
            if (existingService.images && existingService.images.length > 4) {
                throw new common_1.BadRequestException("You can only upload up to 5 images");
            }
            images = existingService.images || [];
            let newimages = await this.fileUploadService.uploadServiceFile(existingService.ownerId.toString(), serviceId, imageFiles);
            images = [...images, ...newimages];
        }
        const videoFiles = dto.video;
        let video = existingService.video;
        let videoFile = [];
        if (videoFiles && videoFiles.length > 0) {
            videoFile = await this.fileUploadService.uploadServiceFile(existingService.ownerId.toString(), existingService._id.toString(), videoFiles, "video");
        }
        if (videoFile && videoFile.length > 0) {
            video = videoFile[0];
        }
        const updated = await this.serviceModel
            .findByIdAndUpdate(serviceId, {
            ...dto,
            ...(dto.category && { category: new mongoose_2.Types.ObjectId(dto.category) }),
            images: images,
            video: video,
        }, { new: true })
            .populate("category");
        if (!updated) {
            throw new common_1.NotFoundException(this.i18n.translate("services.service_not_found", { lang: this.lang }));
        }
        console.log("Updated Service:", video);
        return { ...dto, images, video };
    }
    async delete(serviceId) {
        const existingService = await this.serviceModel.findById(serviceId);
        if (!existingService) {
            throw new common_1.NotFoundException(this.i18n.translate("services.service_not_found", { lang: this.lang }));
        }
        const media = [...existingService.images, existingService.video];
        if (media && media.length > 0) {
            await this.fileUploadService.deleteFiles(media);
        }
        const result = await this.serviceModel.findByIdAndDelete(serviceId);
        if (!result) {
            throw new common_1.NotFoundException(this.i18n.translate("services.service_not_found", { lang: this.lang }));
        }
    }
    async deleteServiceMedia(serviceId, media) {
        const existingService = await this.serviceModel.findById(serviceId);
        if (!existingService) {
            throw new common_1.NotFoundException(this.i18n.translate("services.service_not_found", { lang: this.lang }));
        }
        if (!media || media.length === 0) {
            throw new common_1.BadRequestException(this.i18n.translate("services.no_media_provided", { lang: this.lang }));
        }
        await this.fileUploadService.deleteFiles(media);
        let images = existingService.images || [];
        let video = existingService.video;
        images = images.filter((imgUrl) => !media.includes(imgUrl));
        if (media.includes(video)) {
            video = "";
        }
        existingService.images = images;
        existingService.video = video;
        await existingService.save();
        return true;
    }
    async getById(serviceId) {
        const service = await this.serviceModel
            .findById(serviceId)
            .populate("category");
        if (!service) {
            throw new common_1.NotFoundException(this.i18n.translate("services.service_not_found", { lang: this.lang }));
        }
        return service;
    }
    async getByUser(userId, page = 1, limit = 10) {
        const skip = (page - 1) * limit;
        const [data, total] = await Promise.all([
            this.serviceModel
                .find({ ownerId: new mongoose_2.Types.ObjectId(userId) })
                .populate("category")
                .sort({ createdAt: -1 })
                .skip(skip)
                .limit(limit),
            this.serviceModel.countDocuments({ ownerId: new mongoose_2.Types.ObjectId(userId) }),
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
            filter.title = { $regex: query.name, $options: "i" };
        }
        if (query.category) {
            filter.category = new mongoose_2.Types.ObjectId(query.category);
        }
        const page = query.page && query.page > 0 ? query.page : 1;
        const limit = query.limit && query.limit > 0 ? query.limit : 10;
        const skip = (page - 1) * limit;
        const [results, total] = await Promise.all([
            this.serviceModel
                .find(filter)
                .skip(skip)
                .limit(limit)
                .populate("category")
                .exec(),
            this.serviceModel.countDocuments(filter),
        ]);
        return {
            meta: { total, page, limit, totalPages: Math.ceil(total / limit) },
            data: results,
        };
    }
    async createServiceRequest(dto) {
        const { serviceId, customerId, requestedDateTime, message, } = dto;
        const customer = customerId
            ? await this.userService.findUserById(customerId)
            : null;
        if (customerId && !customer)
            throw new common_1.NotFoundException(this.i18n.translate("services.customer_not_found", { lang: this.lang }));
        if (!serviceId || !requestedDateTime || !customerId) {
            throw new common_1.BadRequestException("Missing required fields for request creation");
        }
        const service = await this.serviceModel.findById(serviceId).populate("ownerId");
        if (!service)
            throw new common_1.NotFoundException(this.i18n.translate("services.service_not_found", { lang: this.lang }));
        const request = new this.requestModel({
            service: new mongoose_2.Types.ObjectId(serviceId),
            customer: new mongoose_2.Types.ObjectId(customerId),
            provider: service.ownerId,
            requestedDateTime: new Date(requestedDateTime),
            status: "pending",
            jobStatus: "not_started",
            message,
        });
        const results = await request.save();
        this.notificationsService.createAndNotify(service.ownerId.toString(), `New service request for "${service.title}" from ${customer?.name || "a user"}`, "SERVICE_REQUEST", { serviceId, customerId, requestedDateTime, service });
        return results;
    }
    async updateRequestStatus(dto) {
        const { requestId, action, proposedDateTime } = dto;
        const request = await this.requestModel
            .findById(requestId)
            .populate("service")
            .populate("customer")
            .populate("provider");
        if (!request)
            throw new common_1.NotFoundException(this.i18n.translate("services.request_not_found", { lang: this.lang }));
        const serviceName = request.service?.title || "service";
        let notificationKey = null;
        let recipientId = request.customer._id.toString();
        let notificationPayload = { requestId: request._id, action, request };
        switch (action) {
            case "accept":
                request.status = "accepted";
                notificationKey = "request_accepted";
                break;
            case "reject":
                request.status = "rejected";
                notificationKey = "request_rejected";
                break;
            case "cancel":
                request.status = "cancelled";
                recipientId = request.provider._id.toString();
                notificationKey = "request_cancelled";
                break;
            case "propose":
                if (!proposedDateTime)
                    throw new common_1.BadRequestException();
                request.status = "proposed";
                request.proposedDateTime = new Date(proposedDateTime);
                notificationKey = "request_proposed";
                Object.assign(notificationPayload, { proposedDate: proposedDateTime });
                break;
            default:
                throw new common_1.BadRequestException(this.i18n.translate("auth.services.unsupported_action"));
        }
        await request.save();
        if (notificationKey) {
            await this.notificationsService.createAndNotify(recipientId, notificationKey, "SERVICE_REQUEST", notificationPayload, { serviceName, proposedDate: proposedDateTime });
        }
        return {
            status: 201,
            message: this.i18n.translate("auth.services.request_status_updated", {
                lang: this.lang,
            }),
            data: {
                requestId,
            },
        };
    }
    async updateJobStatus(dto) {
        const { requestId, action } = dto;
        const request = await this.requestModel.findById(requestId);
        if (!request)
            throw new common_1.NotFoundException("Request not found");
        console.log("Action", action);
        switch (action) {
            case "start_job":
                const existingInProgress = await this.requestModel.findOne({
                    _id: { $ne: new mongoose_2.Types.ObjectId(request._id) },
                    provider: new mongoose_2.Types.ObjectId(request.provider),
                    jobStatus: "in_progress",
                });
                console.log("Existing in-progress job for provider:", existingInProgress, "Provider ID:", request.provider, "Request ID:", request._id);
                if (existingInProgress) {
                    throw new common_1.BadRequestException(this.i18n.translate("auth.services.provider_has_in_progress_job", { lang: this.lang }));
                }
                request.jobStatus = "in_progress";
                request.status = "accepted";
                request.startedAt = new Date();
                break;
            case "complete_job":
                request.status = "accepted";
                request.jobStatus = "completed";
                request.completedAt = new Date();
                break;
            default:
                throw new common_1.BadRequestException(this.i18n.translate("auth.services.unsupported_job_action", {
                    lang: this.lang,
                }));
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
                .populate("service")
                .populate("customer")
                .populate("provider")
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
            throw new common_1.NotFoundException(this.i18n.translate("auth.services.no_requests_found", { lang: this.lang }));
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
    async deleteAllServiceMedia(serviceId, media) {
        const service = await this.serviceModel.findById(serviceId);
        if (!service) {
            throw new common_1.NotFoundException(this.i18n.translate("auth.services.service_not_found", { lang: this.lang }));
        }
        if (!media || media.length === 0) {
            throw new common_1.BadRequestException(this.i18n.translate("auth.services.no_media_provided", { lang: this.lang }));
        }
        await this.fileUploadService.deleteFiles(media);
        let images = service.images || [];
        let video = service.video;
        images = images.filter((imgUrl) => !media.includes(imgUrl));
        if (media.includes(video)) {
            video = "";
        }
        service.images = images;
        service.video = video;
        await service.save();
        return {
            message: this.i18n.translate("auth.services.media_deleted_success", {
                lang: this.lang,
            }),
        };
    }
    async getServicesWithVideos(paginationDto) {
        const { page = 1, limit = 10 } = paginationDto;
        const skip = (page - 1) * limit;
        const filter = {
            video: { $exists: true, $nin: ["", null] },
        };
        const [items, total] = await Promise.all([
            this.serviceModel
                .find(filter)
                .populate("category")
                .sort({ createdAt: -1 })
                .skip(skip)
                .limit(limit)
                .lean()
                .exec(),
            this.serviceModel.countDocuments(filter).exec(),
        ]);
        console.log("It reached here", items, total);
        return {
            meta: { total, page, limit, totalPages: Math.ceil(total / limit) },
            data: items,
        };
    }
};
exports.ServicesService = ServicesService;
exports.ServicesService = ServicesService = __decorate([
    (0, common_1.Injectable)(),
    __param(0, (0, mongoose_1.InjectModel)(services_schema_1.Service.name)),
    __param(1, (0, common_1.Inject)((0, common_1.forwardRef)(() => users_service_1.UsersService))),
    __param(5, (0, mongoose_1.InjectModel)(service_request_schema_1.ServiceRequest.name)),
    __metadata("design:paramtypes", [mongoose_2.Model,
        users_service_1.UsersService,
        notifications_service_1.NotificationsService,
        listing_util_service_1.ListingUtilsService,
        file_upload_service_1.FileUploadService,
        mongoose_2.Model,
        nestjs_i18n_1.I18nService,
        nestjs_cls_1.ClsService])
], ServicesService);
//# sourceMappingURL=services.service.js.map