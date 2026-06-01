import {
  BadRequestException,
  forwardRef,
  Inject,
  Injectable,
  NotFoundException,
} from "@nestjs/common";
import { InjectModel } from "@nestjs/mongoose";
import { Service, ServiceDocument } from "./schema/services.schema";
import { FilterQuery, Model, Types } from "mongoose";
import { I18nService } from "nestjs-i18n";
import { CreateServiceDto } from "./dto/create-service.dto";
import { UpdateServiceDto } from "./dto/update-service.dto";
import { PaginatedResponseDto } from "src/common/dto/pagination-response.dto";
import { PaginationDto } from "src/common/dto/pagination.dto";
import { ListingUtilsService } from "src/shared/listing-util-service";
import { UsersService } from "src/users/users.service";
import { HandleRequestDto } from "./dto/handle-request.do";

import {
  ServiceRequest,
  ServiceRequestDocument,
} from "./schema/service_request.schema";
import { SearchAllProductsServiceDto } from "src/search/dto/product-service-search-for.dto";
import { SearchNearbyServiceDto } from "./dto/search-nearby-service.dto";
import { UpdateJobStatusDto } from "./dto/update-job-dto";
import { UpdateRequestStatusDto } from "./dto/update-request-dto";
import { CreateRequestDto } from "./dto/create-request-dto";
import { NotificationsService } from "src/notifications/notifications.service";
import { FileUploadService } from "src/common/file-upload/file-upload.service";
import { ClsService } from "nestjs-cls";
import { LikeService } from "src/like/like.service";
import { ReviewService } from "src/reviews/reviews.service";

@Injectable()
export class ServicesService {
  constructor(
    @InjectModel(Service.name)
    private readonly serviceModel: Model<ServiceDocument>,
    @Inject(forwardRef(() => UsersService))
    private readonly userService: UsersService,
    private readonly notificationsService: NotificationsService,
    private readonly listingUtils: ListingUtilsService,
    private readonly fileUploadService: FileUploadService,
    @InjectModel(ServiceRequest.name)
    private readonly requestModel: Model<ServiceRequestDocument>,
    private readonly i18n: I18nService,
    private readonly cls: ClsService,
    @Inject(forwardRef(() => LikeService))
    private readonly likeService: LikeService,
    private readonly reviewService: ReviewService,
  ) { }

  private get lang(): string {
    return this.cls?.get("lang") ?? "en";
  }

  // Expose service model for use in other services (e.g., broadcast)
  getServiceModel(): Model<ServiceDocument> {
    return this.serviceModel;
  }

  async create(
    userId: string,
    dto: CreateServiceDto,

  ) {
    const user = await this.userService.findUserById(userId);
    if (!user) {
      throw new NotFoundException(
        this.i18n.translate("auth.services.user_not_found", {
          lang: this.lang,
        }),
      );
    }
    const existingService = await this.serviceModel.findOne({
      ownerId: user._id,
      isDeleted: false
    });
    if (existingService) {
      throw new BadRequestException(
        this.i18n.translate("auth.services.user_duplicate_service", {
          lang: this.lang,
        }),
      );
    }
    if (
      !user.location ||
      !user.location.coordinates ||
      user.location.coordinates.length !== 2
    ) {
      throw new BadRequestException(
        this.i18n.translate("auth.services.user_location_missing", {
          lang: this.lang,
        }),
      );
    }
    let images: string[] = [];
    let imageFiles: Express.Multer.File[] = [];
    let videoFiles: Express.Multer.File[] = [];
    if (dto.images) {
      imageFiles = dto.images as Express.Multer.File[];
    }

    if (imageFiles.length > 5) {
      throw new BadRequestException(
        this.i18n.translate("auth.services.media_limit_exceeded", {
          lang: this.lang,
        }),
      );
    }
    if (dto.video) {
      videoFiles = dto.video as Express.Multer.File[];
    }
    const created = await this.serviceModel.create({
      ...dto,
      ownerId: new Types.ObjectId(userId),
      category: new Types.ObjectId(dto.category),
      location: user.location,
      images: [],
      video: "",
    });

    if (imageFiles && imageFiles.length > 0) {
      images = await this.fileUploadService.uploadServiceFile(
        userId,
        (created._id as Types.ObjectId).toString(),
        imageFiles,
      );
      created.images = images;
    }
    if (videoFiles && videoFiles.length > 0) {
      const video = await this.fileUploadService.uploadServiceFile(
        userId,
        (created._id as Types.ObjectId).toString(),
        videoFiles,
        "video",
      );
      created.video = video[0]; // Assuming only one video file is uploaded
    }
    await created.save(); // Save the service again to update the images and video fields
    return { message: this.i18n.translate("auth.services.created_success", { lang: this.lang }), data: created.populate("category") };
  }

  async update(serviceId: string, dto: UpdateServiceDto) {
    Object.keys(dto).forEach((key) => {
      if (
        dto[key] === "" || // empty string
        dto[key] === null || // null
        typeof dto[key] === "undefined"
      ) {
        delete dto[key]; // remove it from updateData
      }
    });
    const existingService = await this.serviceModel.findOne({ _id: new Types.ObjectId(serviceId), isDeleted: false });
    if (!existingService) {
      throw new NotFoundException("Service not found");
    }
    const imageFiles = dto.images as Express.Multer.File[];
    let images = existingService.images; // Preserve existing images if not updated
    if (imageFiles && imageFiles.length > 0) {
      if (existingService.images && existingService.images.length > 4) {
        throw new BadRequestException("You can only upload up to 5 images");
      }
      images = existingService.images || [];
      const newimages = await this.fileUploadService.uploadServiceFile(
        existingService.ownerId.toString(),
        serviceId,
        imageFiles,
      );
      images = [...images, ...newimages];
    }
    const videoFiles = dto.video as Express.Multer.File[];
    let video = existingService.video; // Preserve existing video if not updated
    let videoFile: string[] = [];
    if (videoFiles && videoFiles.length > 0) {
      videoFile = await this.fileUploadService.uploadServiceFile(
        existingService.ownerId.toString(),
        (existingService._id as Types.ObjectId).toString(),
        videoFiles,
        "video",
      );
    }

    if (videoFile && videoFile.length > 0) {
      video = videoFile[0]; // Assuming only one video file is uploaded
    }
    const updated = await this.serviceModel
      .findByIdAndUpdate(
        serviceId,
        {
          ...dto,
          ...(dto.category && { category: new Types.ObjectId(dto.category) }),
          images: images,
          video: video,
        },
        { new: true },
      )
      .populate("category");

    if (!updated) {
      throw new NotFoundException(
        this.i18n.translate("auth.services.service_not_found", {
          lang: this.lang,
        }),
      );
    }
    console.log("Updated Service:", video);
    return { message: this.i18n.translate("auth.services.updated_success", { lang: this.lang }), data: { ...dto, images, video } }; // Ensure the images and video are included in the returned object
  }

  async delete(serviceId: string) {
    const existingService = await this.serviceModel.findOne({ _id: new Types.ObjectId(serviceId), isDeleted: false });
    if (!existingService) {
      throw new NotFoundException(
        this.i18n.translate("auth.services.service_not_found", {
          lang: this.lang,
        }),
      );
      // Ensure the service exists before attempting to delete
    }
    let media: string[] = []
    if (existingService.images.length != 0) {
      media = [...existingService.images];
    }
    if (existingService.video) {
      media.push(existingService.video);
    }

    if (media && media.length > 0) {
      await this.fileUploadService.deleteFiles(media); // Delete associated media files
    }
    const result = await this.serviceModel.findByIdAndUpdate(new Types.ObjectId(serviceId), { isDeleted: true, imageUrls: [], video: "" });
    if (!result) {
      throw new NotFoundException(
        this.i18n.translate("auth.services.service_not_found", {
          lang: this.lang,
        }),
      );
    }
    return { status: 200, message: this.i18n.translate("auth.services.deleted_success", { lang: this.lang }) };
  }

  async deleteServiceMedia(serviceId: string, media: string[]) {
    const existingService = await this.serviceModel.findOne({ _id: new Types.ObjectId(serviceId), isDeleted: false });
    if (!existingService) {
      throw new NotFoundException(
        this.i18n.translate("auth.services.service_not_found", {
          lang: this.lang,
        }),
      );
    }
    if (!media || media.length === 0) {
      throw new BadRequestException(
        this.i18n.translate("auth.services.no_media_provided", {
          lang: this.lang,
        }),
      );
    }

    // Remove media files from storage
    await this.fileUploadService.deleteFiles(media);

    // Remove media from product document
    let images = existingService.images || [];
    let video = existingService.video;

    // Remove any images that match the URLs
    images = images.filter((imgUrl) => !media.includes(imgUrl));

    // Remove video if its URL is in the media array
    if (media.includes(video)) {
      video = "";
    }

    // Update the product
    existingService.images = images;
    existingService.video = video;
    await existingService.save();

    return true;
  }

  async getById(serviceId: string): Promise<Service> {
    const service = await this.serviceModel
      .findOne({ _id: new Types.ObjectId(serviceId), isDeleted: false })
      .populate("category")
      .populate("ownerId");

    if (!service) {
      throw new NotFoundException(
        this.i18n.translate("auth.services.service_not_found", {
          lang: this.lang,
        }),
      );
    }

    return service;
  }

  async getByUser(
    userId: string,
    page: number = 1,
    limit: number = 10,
  ): Promise<PaginatedResponseDto<Service>> {
    const skip = (page - 1) * limit;

    const filter: FilterQuery<ServiceDocument> = {
      ownerId: new Types.ObjectId(userId),
      isDeleted: false,
    };
    const [data, total] = await Promise.all([
      this.serviceModel
        .find(filter)
        .populate("category").populate("ownerId")
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit),
      this.serviceModel.countDocuments({ ownerId: new Types.ObjectId(userId), isDeleted: false }),
    ]);

    return {
      meta: { total, page, limit, totalPages: Math.ceil(total / limit) },
      data: data,
    };
  }

  async searchNearbyWithCategory(
    category: string,
    coordinates: [number, number],
    radius: number,
    pagination: PaginationDto,
  ) {
    return this.listingUtils.findNearbyWithCategory(
      this.serviceModel,
      category,
      coordinates,
      radius,
      pagination,
    );
  }

  async searchNearbyServices(query: SearchNearbyServiceDto) {
    const coordinates: [number, number] = [query.lng, query.lat];
    const radiusMeters = query.radius * 1000;
    const page = query.page && query.page > 0 ? query.page : 1;
    const limit = query.limit && query.limit > 0 ? query.limit : 10;
    const skip = (page - 1) * limit;

    const serviceQuery: Record<string, any> = { isDeleted: false };
    if (query.category) {
      serviceQuery.category = new Types.ObjectId(query.category);
    }

    const [results, countAgg] = await Promise.all([
      this.serviceModel.aggregate([
        {
          $geoNear: {
            near: { type: "Point", coordinates },
            distanceField: "distance",
            maxDistance: radiusMeters,
            query: serviceQuery,
            spherical: true,
          },
        },
        { $sort: { createdAt: -1 } },
        { $skip: skip },
        { $limit: limit },
        {
          $lookup: {
            from: "categories",
            localField: "category",
            foreignField: "_id",
            as: "category",
          },
        },
        {
          $unwind: {
            path: "$category",
            preserveNullAndEmptyArrays: true,
          },
        },
      ]),
      this.serviceModel.aggregate([
        {
          $geoNear: {
            near: { type: "Point", coordinates },
            distanceField: "distance",
            maxDistance: radiusMeters,
            query: serviceQuery,
            spherical: true,
          },
        },
        { $count: "total" },
      ]),
    ]);

    const total = countAgg[0]?.total || 0;
    const enrichedResults = await this.enrichServicesWithReviewStats(results);

    return {
      meta: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
      data: enrichedResults,
    };
  }

  async updateLocationByShopId(
    shopId: string,
    location: { type: "Point"; coordinates: [number, number] },
  ) {
    await this.serviceModel.updateMany({ shopId }, { $set: { location } });
  }

  async searchServices(query: SearchAllProductsServiceDto) {
    // Build filter only with present fields
    const filter: Record<string, any> = {};

    if (query.name) {
      filter.title = { $regex: query.name, $options: "i" };
    }
    if (query.category) {
      filter.category = new Types.ObjectId(query.category);
    }
    filter.isDeleted = false;

    const page = query.page && query.page > 0 ? query.page : 1;
    const limit = query.limit && query.limit > 0 ? query.limit : 10;
    const skip = (page - 1) * limit;

    const [results, total] = await Promise.all([
      this.serviceModel
        .find(filter)
        .skip(skip)
        .limit(limit)
        .populate("category").sort({ createdAt: -1 })
        .lean()
        .exec(),
      this.serviceModel.countDocuments(filter),
    ]);

    const enrichedResults = await this.enrichServicesWithReviewStats(results);

    return {
      meta: { total, page, limit, totalPages: Math.ceil(total / limit) },
      data: enrichedResults,
    };
  }

  private async enrichServicesWithReviewStats(services: any[]) {
    if (!services || services.length === 0) {
      return services;
    }

    const serviceIds = services.map((service) =>
      new Types.ObjectId(service._id),
    );
    const reviewStats = await this.reviewService.getAverageRatingsForItems(
      serviceIds,
      "service",
    );

    const reviewMap = new Map(
      reviewStats.map((item: any) => [
        (item._id as Types.ObjectId).toString(),
        {
          avgRating: item.avgRating ?? 0,
          reviewCount: item.count ?? 0,
        },
      ]),
    );

    return services.map((service: any) => {
      const stats = reviewMap.get(new Types.ObjectId(service._id).toString());
      return {
        ...service,
        averageRating: stats?.avgRating
          ? Number(stats.avgRating.toFixed(1))
          : 0,
        reviewCount: stats?.reviewCount ?? 0,
      };
    });
  }

  async createServiceRequest(dto: CreateRequestDto) {
    const { serviceId, customerId, requestedDateTime, message } = dto;

    // --- Validation: User Existence ---
    const customer = customerId
      ? await this.userService.findUserById(customerId)
      : null;

    if (customerId && !customer)
      throw new NotFoundException(
        this.i18n.translate("auth.services.customer_not_found", {
          lang: this.lang,
        }),
      );

    // --- Creation Flow ---

    if (!serviceId || !requestedDateTime || !customerId) {
      throw new BadRequestException(
        "Missing required fields for request creation",
      );
    }

    const service = await this.serviceModel
      .findById(serviceId)
      .populate("ownerId");
    if (!service)
      throw new NotFoundException(
        this.i18n.translate("auth.services.service_not_found", {
          lang: this.lang,
        }),
      );

    const request = new this.requestModel({
      service: new Types.ObjectId(serviceId),
      customer: new Types.ObjectId(customerId),
      provider: service.ownerId,
      requestedDateTime: new Date(requestedDateTime),
      status: "pending",
      jobStatus: "not_started",
      message,
    });

    const results = await request.save();
    this.notificationsService.createAndNotify(
      service.ownerId._id.toString(),
      "request_created",
      "SERVICE_REQUEST",
      { serviceId: new Types.ObjectId(serviceId), customerId: new Types.ObjectId(customerId), requestedDateTime },
      { serviceName: service.title, customerName: customer?.name || "A customer" },
    );

    return {
      data: results,
      message: this.i18n.translate("auth.services.request_created_success", {
        lang: this.lang,
      }),
    }
  }
  async updateRequestStatus(dto: UpdateRequestStatusDto) {
    const { requestId, action, proposedDateTime } = dto;

    const request = await this.requestModel
      .findById(requestId)
      .populate("service")
      .populate("customer")
      .populate("provider");

    if (!request)
      throw new NotFoundException(
        this.i18n.translate("auth.services.request_not_found", {
          lang: this.lang,
        }),
      );

    // ✅ Safely extract service name (avoid using full object)
    const serviceName = (request.service as any)?.title || "service";

    // 1. Prepare variables at the top
    let notificationKey: string | null = null;
    let recipientId: string = request.customer._id.toString();
    const notificationPayload = { requestId: request._id, action, request };

    // 2. The Switch logic (ONLY updates status and picks the message key)
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
        recipientId = request.provider._id.toString(); // Switch recipient
        notificationKey = "request_cancelled";
        break;

      case "propose":
        if (!proposedDateTime) throw new BadRequestException(/* ... */);

        request.status = "proposed";
        request.proposedDateTime = new Date(proposedDateTime);
        notificationKey = "request_proposed";
        // Add extra data specifically for this case
        Object.assign(notificationPayload, { proposedDate: proposedDateTime });
        break;

      default:
        throw new BadRequestException(
          this.i18n.translate("auth.services.unsupported_action"),
        );
    }

    // 3. Perform the DB Operation (The Source of Truth)
    await request.save();

    // 4. Dispatch Notification (Only if save succeeded and we have a key)
    if (notificationKey) {
      // We don't 'await' this if we don't want to make the user wait for FCM/Sockets,
      // OR we await it to ensure the user knows it was sent.
      await this.notificationsService.createAndNotify(
        recipientId,
        notificationKey, // Use the translation key decided in the switch
        "SERVICE_REQUEST",
        notificationPayload, // Mandatory Payload
        { serviceName, proposedDate: proposedDateTime }, // i18n Args
      );
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

  async updateJobStatus(dto: UpdateJobStatusDto) {
    const { requestId, action } = dto;

    const request = await this.requestModel.findById(requestId);
    if (!request) throw new NotFoundException("Request not found");
    console.log("Action", action);
    switch (action) {
      case "start_job":
        // Check if provider already has another in_progress job
        const existingInProgress = await this.requestModel.findOne({
          _id: { $ne: new Types.ObjectId(request._id) },
          provider: new Types.ObjectId(request.provider),
          jobStatus: "in_progress",
        });

        console.log(
          "Existing in-progress job for provider:",
          existingInProgress,
          "Provider ID:",
          request.provider,
          "Request ID:",
          request._id,
        );
        if (existingInProgress) {
          throw new BadRequestException(
            this.i18n.translate("auth.services.provider_has_in_progress_job", {
              lang: this.lang,
            }),
          );
        }

        request.jobStatus = "in_progress";
        request.status = "accepted";
        request.startedAt = new Date();
        break;

      case "complete_job":
        request.status = "accepted"; // keep it consistent
        request.jobStatus = "completed";
        request.completedAt = new Date();

        break;

      default:
        throw new BadRequestException(
          this.i18n.translate("auth.services.unsupported_job_action", {
            lang: this.lang,
          }),
        );
    }

    const result = await request.save();
    return {
      message: this.i18n.translate("auth.services.job_status_updated", {
        lang: this.lang,
        args: {
          jobStatus: request.jobStatus,
        },
      }),
      data: {
        requestId: result._id,
        jobStatus: result.jobStatus,
      },
    };
  }

  async getServiceRequestsByUser(
    userId: string,
    role: "customer" | "provider",
    page = 1,
    limit = 10,
    jobStatus?: string,
    status?: string,
  ): Promise<PaginatedResponseDto<ServiceRequest>> {
    const skip = (page - 1) * limit;
    const filter: FilterQuery<ServiceRequestDocument> = {};

    if (role === "customer") {
      filter.customer = new Types.ObjectId(userId);
    } else if (role === "provider") {
      filter.provider = new Types.ObjectId(userId);
    } else {
      throw new BadRequestException(
        "Invalid role value. Expected 'customer' or 'provider'.",
      );
    }

    if (jobStatus) {
      filter.jobStatus = jobStatus;
    }

    if (status) {
      filter.status = status;
    }

    const [requests, total] = await Promise.all([
      this.requestModel
        .find(filter)
        .populate("service")
        .populate("customer")
        .populate("provider")
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .exec(),
      this.requestModel.countDocuments(filter),
    ]);



    if (!requests || requests.length === 0) {
      throw new NotFoundException(
        this.i18n.translate("auth.services.no_requests_found", {
          lang: this.lang,
        }),
      );
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

  async deleteAllServiceMedia(serviceId: string, media: string[]) {
    const service = await this.serviceModel.findById(serviceId);
    if (!service) {
      throw new NotFoundException(
        this.i18n.translate("auth.services.service_not_found", {
          lang: this.lang,
        }),
      );
    }
    if (!media || media.length === 0) {
      throw new BadRequestException(
        this.i18n.translate("auth.services.no_media_provided", {
          lang: this.lang,
        }),
      );
    }

    // Remove media files from storage
    await this.fileUploadService.deleteFiles(media);

    // Remove media from product document
    let images = service.images || [];
    let video = service.video;

    // Remove any images that match the URLs
    images = images.filter((imgUrl) => !media.includes(imgUrl));

    // Remove video if its URL is in the media array
    if (media.includes(video)) {
      video = "";
    }

    // Update the product
    service.images = images;
    service.video = video;
    await service.save();
    return {
      message: this.i18n.translate("auth.services.media_deleted_success", {
        lang: this.lang,
      }),
    };
  }

  async getServicesWithVideos(
    paginationDto: PaginationDto,
    userId: string,
    category?: string,
  ): Promise<PaginatedResponseDto<Service>> {
    const { page = 1, limit = 10 } = paginationDto;
    const skip = (page - 1) * limit;

    // ✅ Robust filter (handles null, empty string, missing field)
    const filter: FilterQuery<Service> = {
      video: { $exists: true, $nin: ["", null] },
      isDeleted: false, // Exclude deleted services
    };


    if (category) {
      filter.category = new Types.ObjectId(category);
    }
    const [items, total] = await Promise.all([
      this.serviceModel
        .find(filter)
        .populate("category")
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .lean() // optional but good for performance
        .exec(),

      this.serviceModel.countDocuments(filter).exec(),
    ]);
    const productIds = items.map((item: any) => new Types.ObjectId(item._id));

    const likes = await this.likeService.getLikesByUser(
      userId,
      "service",
      productIds,
    );

    console.log("Services with Likes:", likes);

    const likedServiceIds = new Set(
      likes.map((like: any) => like.itemId.toString()),
    );
    console.log("Liked Service IDs:", likedServiceIds);
    const data = items.map((item: any) => ({
      ...item, // Now safe because of .lean()
      isLiked: likedServiceIds.has(item._id.toString()),
    }));

    return {
      meta: { total, page, limit, totalPages: Math.ceil(total / limit) },
      data: data,
    };
  }

  async getServicesRequestsForCustomer(
    customerId: string,
    paginationDto: PaginationDto,
    jobStatus?: string,
    status?: string,
  ): Promise<PaginatedResponseDto<ServiceRequest>> {
    const { page = 1, limit = 10 } = paginationDto;
    const skip = (page - 1) * limit;


    const existingCustomer = await this.userService.findUserById(customerId);
    if (!existingCustomer) {
      throw new NotFoundException(
        this.i18n.translate("auth.users.user_not_found", {
          lang: this.lang,
        }),
      );
    }
    console.log("Existing customer", existingCustomer)

    const filter: FilterQuery<ServiceRequestDocument> = {
      customer: new Types.ObjectId(customerId),
    };

    if (jobStatus) {
      filter.jobStatus = jobStatus;
    }
    if (status) {
      filter.status = status;
    }

    console.log("Filter for customer requests:", filter);
    const requests = await this.requestModel
      .find(filter)
      .populate({
        path: "provider",
        select: "name email",
      })
      .populate({
        path: "customer",
        select: "name email",
      })
      .populate({
        path: "service",
        populate: {
          path: "category",
        },
      })
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .lean()
      .exec();
    const total = await this.requestModel.countDocuments(filter).exec();

    return {
      meta: { total, page, limit, totalPages: Math.ceil(total / limit) },
      data: requests,
    };
  }
}


