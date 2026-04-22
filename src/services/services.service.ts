import {
  BadRequestException,
  forwardRef,
  Inject,
  Injectable,
  NotFoundException,
} from "@nestjs/common";
import { InjectModel } from "@nestjs/mongoose";
import { Service, ServiceDocument } from "./schema/services.schema";
import { Model, Types } from "mongoose";
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
import { UpdateJobStatusDto } from "./dto/update-job-dto";
import { UpdateRequestStatusDto } from "./dto/update-request-dto";
import { CreateRequestDto } from "./dto/create-request-dto";
import { NotificationsService } from "src/notifications/notifications.service";
import { FileUploadService } from "src/common/file-upload/file-upload.service";
import { ClsService } from "nestjs-cls";

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
  ) {}

  private get lang(): string {
    return this.cls?.get("lang") ?? "en";
  }

  async create(
    userId: string,
    dto: CreateServiceDto,
    lang: string = "en",
  ): Promise<Service> {
    const user = await this.userService.findUserById(userId);
    if (!user) {
      throw new NotFoundException(
        this.i18n.translate("services.user_not_found", { lang: this.lang }),
      );
    }
    const existingService = await this.serviceModel.findOne({
      ownerId: user._id,
    });
    if (existingService) {
      throw new BadRequestException(
        this.i18n.translate("services.user_duplicate_service", {
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
        this.i18n.translate("services.user_location_missing", {
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
        this.i18n.translate("services.media_limit_exceeded", {
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
    return created.populate("category");
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
    const existingService = await this.serviceModel.findById(serviceId);
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
      let newimages = await this.fileUploadService.uploadServiceFile(
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
        this.i18n.translate("services.service_not_found", { lang: this.lang }),
      );
    }
    console.log("Updated Service:", video);
    return { ...dto, images, video }; // Ensure the images and video are included in the returned object
  }

  async delete(serviceId: string): Promise<void> {
    const existingService = await this.serviceModel.findById(serviceId);
    if (!existingService) {
      throw new NotFoundException(
        this.i18n.translate("services.service_not_found", { lang: this.lang }),
      );
      // Ensure the service exists before attempting to delete
    }
    const media = [...existingService.images, existingService.video];
    if (media && media.length > 0) {
      await this.fileUploadService.deleteFiles(media); // Delete associated media files
    }
    const result = await this.serviceModel.findByIdAndDelete(serviceId);
    if (!result) {
      throw new NotFoundException(
        this.i18n.translate("services.service_not_found", { lang: this.lang }),
      );
    }
  }

  async deleteServiceMedia(serviceId: string, media: string[]) {
    const existingService = await this.serviceModel.findById(serviceId);
    if (!existingService) {
      throw new NotFoundException(
        this.i18n.translate("services.service_not_found", { lang: this.lang }),
      );
    }
    if (!media || media.length === 0) {
      throw new BadRequestException(
        this.i18n.translate("services.no_media_provided", { lang: this.lang }),
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
      .findById(serviceId)
      .populate("category");

    if (!service) {
      throw new NotFoundException(
        this.i18n.translate("services.service_not_found", { lang: this.lang }),
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

    const [data, total] = await Promise.all([
      this.serviceModel
        .find({ ownerId: new Types.ObjectId(userId) })
        .populate("category")
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit),
      this.serviceModel.countDocuments({ ownerId: new Types.ObjectId(userId) }),
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

  async createServiceRequest(dto: CreateRequestDto) {
    const {
      serviceId,
      customerId,

      requestedDateTime,

      message,
    } = dto;

    // --- Validation: User Existence ---
    const customer = customerId
      ? await this.userService.findUserById(customerId)
      : null;

    if (customerId && !customer)
      throw new NotFoundException(
        this.i18n.translate("services.customer_not_found", { lang: this.lang }),
      );

    // --- Creation Flow ---

    if (!serviceId || !requestedDateTime || !customerId) {
      throw new BadRequestException(
        "Missing required fields for request creation",
      );
    }

    const service = await this.serviceModel.findById(serviceId);
    if (!service)
      throw new NotFoundException(
        this.i18n.translate("services.service_not_found", { lang: this.lang }),
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
    this.notificationsService.createAndNotify(
      service.ownerId.toString(),
      `New service request for "${service.title}" from ${customer?.name || "a user"}`,
    );

    return request.save();
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
        this.i18n.translate("services.request_not_found", { lang: this.lang }),
      );

    // ✅ Safely extract service name (avoid using full object)
    const serviceName = (request.service as any)?.title || "service";

    switch (action) {
      case "accept":
        request.status = "accepted";
        console.log("Look here", request.customer);
        await this.notificationsService.createAndNotify(
          request.customer._id.toString(),
          `Your service request for "${serviceName}" has been accepted by the provider.`,
        );
        break;

      case "reject":
        request.status = "rejected";

        await this.notificationsService.createAndNotify(
          request.customer._id.toString(),
          `Your service request for "${serviceName}" has been rejected by the provider.`,
        );
        break;

      case "cancel":
        request.status = "cancelled";

        await this.notificationsService.createAndNotify(
          request.provider._id.toString(),
          `Service request for "${serviceName}" has been cancelled by the customer.`,
        );
        break;

      case "propose":
        if (!proposedDateTime) {
          throw new BadRequestException(
  this.i18n.translate("services.proposed_date_required", { lang: this.lang }),
);
        }

        const parsedDate = new Date(proposedDateTime);
        if (isNaN(parsedDate.getTime())) {
        throw new BadRequestException(
  this.i18n.translate("services.invalid_proposed_date", { lang: this.lang }),
);

        }

        request.status = "proposed";
        request.proposedDateTime = parsedDate;

        await this.notificationsService.createAndNotify(
          request.customer._id.toString(),
          `Your service request for "${serviceName}" has a new proposed date: ${parsedDate.toISOString()}`,
        );
        break;

      default:
       throw new BadRequestException(
  this.i18n.translate("services.unsupported_action", { lang: this.lang }),
);
    }

    await request.save();
    return {
      status: 201,
      message: this.i18n.translate("services.request_status_updated", { lang: this.lang }),
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
        request.jobStatus = "in_progress";
        request.status = "accepted"; // keep it consistent
        break;

      case "complete_job":
        request.jobStatus = "completed";

        break;

      default:
        
throw new BadRequestException(
  this.i18n.translate("services.unsupported_job_action", { lang: this.lang }),
);
    }

    return request.save();
  }

  async getServiceRequestsByUser(
    userId: string,
    page = 1,
    limit = 10,
  ): Promise<PaginatedResponseDto<ServiceRequest>> {
    const skip = (page - 1) * limit;

    const [requests, total] = await Promise.all([
      this.requestModel
        .find({
          $or: [
            { customer: new Types.ObjectId(userId) },
            { provider: new Types.ObjectId(userId) },
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
          { customer: new Types.ObjectId(userId) },
          { provider: new Types.ObjectId(userId) },
        ],
      }),
    ]);

    if (!requests || requests.length === 0) {
     throw new NotFoundException(
  this.i18n.translate("services.no_requests_found", { lang: this.lang }),
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
  this.i18n.translate("services.service_not_found", { lang: this.lang }),
);
    }
    if (!media || media.length === 0) {
     throw new BadRequestException(
  this.i18n.translate("services.no_media_provided", { lang: this.lang }),
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
  message: this.i18n.translate("services.media_deleted_success", {
    lang: this.lang,
  })}
  }

  async getServicesWithVideos(
    paginationDto: PaginationDto,
  ): Promise<PaginatedResponseDto<Service>> {
    const { page = 1, limit = 10 } = paginationDto;
    const skip = (page - 1) * limit;

    // ✅ Robust filter (handles null, empty string, missing field)
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
        .lean() // optional but good for performance
        .exec(),

      this.serviceModel.countDocuments(filter).exec(),
    ]);
    console.log("It reached here", items, total);
    return {
      meta: { total, page, limit, totalPages: Math.ceil(total / limit) },
      data: items,
    };
  }
}
