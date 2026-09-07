import {
  BadRequestException,
  forwardRef,
  Inject,
  Injectable,
  Logger,
  NotFoundException,
} from "@nestjs/common";
import { I18nService } from "nestjs-i18n";
import { CreateServiceDto } from "./dto/create-service.dto";
import { UpdateServiceDto } from "./dto/update-service.dto";
import { PaginatedResponseDto } from "src/common/dto/pagination-response.dto";
import { PaginationDto } from "src/common/dto/pagination.dto";
import { ListingUtilsService } from "src/shared/listing-util-service";
import { UsersService } from "src/users/users.service";

import { SearchAllProductsServiceDto } from "src/search/dto/product-service-search-for.dto";
import { SearchNearbyServiceDto } from "./dto/search-nearby-service.dto";
import { UpdateJobStatusDto } from "./dto/update-job-dto";
import { UpdateRequestStatusDto } from "./dto/update-request-dto";
import { CreateRequestDto } from "./dto/create-request-dto";
import { NotificationsService } from "src/notifications/notifications.service";
import { FileUploadService } from "src/common/file-upload/file-upload.service";
import { ClsService } from "nestjs-cls";
import { LikeService } from "src/like/like.service";
import { ShareService } from "src/share/share.service";
import { ReviewService } from "src/reviews/reviews.service";
import { assertOwnerOrPermission } from "src/common/utils/permission.utils";
import { PermissionEntry } from "src/common/constants/admin-permissions.constants";
import { EmailService } from "src/common/email-service/email-service";
import { EmailLogService } from "src/email-log/email-log.service";
import { PrismaService } from "src/prisma/prisma.service";
import { GeoRepository } from "src/prisma/repositories/geo.repository";
import { FeedRepository } from "src/prisma/repositories/feed.repository";
import { generateObjectId, isObjectIdLike } from "src/common/utils/object-id.util";
import { toLatLng, withGeoJson } from "src/common/utils/geo.util";
import {
  SERVICE_INCLUDE,
  bookingStatusFilter,
  computeBookingStatus,
  type BookingStatus,
  type JobStatus,
  type RequestStatus,
  type ServiceApi,
  type ServicePaymentType,
  type ServiceRequest,
} from "./model/service.model";
import { Prisma } from "../../generated/prisma/client";
import { resolvePagination } from "src/common/utils/pagination.util";

/** A service carries a video when the column is non-null and non-empty. */
const HAS_VIDEO: Prisma.ServiceWhereInput = { video: { not: null, notIn: [""] } };

@Injectable()
export class ServicesService {
  private readonly logger = new Logger(ServicesService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly geoRepository: GeoRepository,
    private readonly feedRepository: FeedRepository,
    @Inject(forwardRef(() => UsersService))
    private readonly userService: UsersService,
    private readonly notificationsService: NotificationsService,
    private readonly listingUtils: ListingUtilsService,
    private readonly fileUploadService: FileUploadService,
    private readonly i18n: I18nService,
    private readonly cls: ClsService,
    @Inject(forwardRef(() => LikeService))
    private readonly likeService: LikeService,
    private readonly shareService: ShareService,
    private readonly reviewService: ReviewService,
    private readonly emailService: EmailService,
    private readonly emailLogService: EmailLogService,
  ) {}

  private get lang(): string {
    return this.cls?.get("lang") ?? "en";
  }

  /** Rebuilds the document shape clients expect: GeoJSON `location`, the owner
   *  relation back under `ownerId`, and `_id` alongside `id`. */
  private toApiShape<T extends Record<string, any>>(service: T | null): any {
    if (!service) return service;
    const { owner, ...rest } = service as any;
    const shaped = withGeoJson(rest as any) as any;
    return {
      ...shaped,
      _id: shaped.id,
      ownerId: owner ?? shaped.ownerId,
    };
  }

  /** Clients read `_id`; Prisma rows carry `id`. */
  private withLegacyId<T extends { id: string }>(row: T): T & { _id: string } {
    return { ...row, _id: row.id };
  }

  /** Fire-and-forget: creation must succeed even if the email provider is down. */
  private sendServiceCreatedEmail(
    name: string,
    email: string,
    title: string,
    serviceId: string,
    serviceCode?: string | null,
  ) {
    const serviceUrl = `${process.env.FRONTEND_URL}/book-service?id=${serviceId}`;
    const html = `
      <h2>Your service has been created</h2>
      <p>Hi ${name},</p>
      <p>Your service "${title}" has been created successfully.</p>
      <p><a href="${serviceUrl}">${serviceUrl}</a></p>
    `;
    this.emailService
      .sendEmail(email, "Your service has been created", html)
      .then(() =>
        this.emailLogService.record({
          eventType: "service_created",
          recipient: email,
          relatedRecordId: serviceCode ?? undefined,
          deliveryStatus: "sent",
        }),
      )
      .catch((err) => {
        this.logger.error(`Service-created email to ${email} failed`, err);
        void this.emailLogService.record({
          eventType: "service_created",
          recipient: email,
          relatedRecordId: serviceCode ?? undefined,
          deliveryStatus: "failed",
        });
      });
  }

  /** Fire-and-forget: the status update must succeed even if the email provider is down. */
  private sendBookingAcceptedEmail(
    name: string,
    email: string,
    serviceName: string,
    jobCode?: string | null,
  ) {
    const bookingUrl = `${process.env.FRONTEND_URL}/profile?tab=my_requests`;
    const html = `
      <h2>Your booking has been accepted</h2>
      <p>Hi ${name},</p>
      <p>Your booking for "${serviceName}" has been accepted by the service provider.</p>
      <p><a href="${bookingUrl}">${bookingUrl}</a></p>
    `;
    this.emailService
      .sendEmail(email, "Your booking has been accepted", html)
      .then(() =>
        this.emailLogService.record({
          eventType: "booking_accepted",
          recipient: email,
          relatedRecordId: jobCode ?? undefined,
          deliveryStatus: "sent",
        }),
      )
      .catch((err) => {
        this.logger.error(`Booking-accepted email to ${email} failed`, err);
        void this.emailLogService.record({
          eventType: "booking_accepted",
          recipient: email,
          relatedRecordId: jobCode ?? undefined,
          deliveryStatus: "failed",
        });
      });
  }

  /**
   * Owner ids of services in a category within a radius.
   *
   * Replaces `getServiceModel()`, which handed the raw Mongoose model to
   * BroadcastService so it could run its own $near query. Exposing the model
   * leaked the data layer across a module boundary; this is the capability that
   * caller actually wanted.
   */
  async findNearbyServiceOwnerIds(
    categoryId: string,
    coordinates: [number, number],
    radiusInMeters: number,
  ): Promise<string[]> {
    const [longitude, latitude] = coordinates;
    return this.feedRepository.findNearbyListingOwnerIds({
      table: "services",
      categoryId,
      longitude,
      latitude,
      radiusMeters: radiusInMeters,
    });
  }

  /** Atomically reserves the next sequential service code (e.g. SVC-000010). */
  private async generateNextServiceCode(): Promise<string> {
    const counter = await this.prisma.counter.upsert({
      where: { id: "serviceCode" },
      create: { id: "serviceCode", seq: 1 },
      update: { seq: { increment: 1 } },
    });
    return `SVC-${String(counter.seq).padStart(6, "0")}`;
  }

  /** Atomically reserves the next sequential booking/job code (e.g. JOB-000010). */
  private async generateNextJobCode(): Promise<string> {
    const counter = await this.prisma.counter.upsert({
      where: { id: "jobCode" },
      create: { id: "jobCode", seq: 1 },
      update: { seq: { increment: 1 } },
    });
    return `JOB-${String(counter.seq).padStart(6, "0")}`;
  }

  async create(userId: string, dto: CreateServiceDto) {
    const user = await this.userService.findUserById(userId);
    if (!user) {
      throw new NotFoundException(
        this.i18n.translate("auth.services.user_not_found", { lang: this.lang }),
      );
    }

    const existingService = await this.prisma.service.findFirst({
      where: { ownerId: userId, isDeleted: false, isDisabled: false },
      select: { id: true },
    });
    if (existingService) {
      throw new BadRequestException(
        this.i18n.translate("auth.services.user_duplicate_service", { lang: this.lang }),
      );
    }

    if (
      !user.location ||
      !user.location.coordinates ||
      user.location.coordinates.length !== 2
    ) {
      throw new BadRequestException(
        this.i18n.translate("auth.services.user_location_missing", { lang: this.lang }),
      );
    }

    const imageFiles = (dto.images as Express.Multer.File[]) ?? [];
    if (imageFiles.length > 5) {
      throw new BadRequestException(
        this.i18n.translate("auth.services.media_limit_exceeded", { lang: this.lang }),
      );
    }
    const videoFiles = (dto.video as unknown as Express.Multer.File[]) ?? [];

    const serviceCode = await this.generateNextServiceCode();
    const serviceId = generateObjectId();
    const { latitude, longitude } = toLatLng(user.location);

    let images: string[] = [];
    if (imageFiles.length > 0) {
      images = await this.fileUploadService.uploadServiceFile(
        userId,
        serviceId,
        imageFiles,
      );
    }

    let video: string | null = null;
    if (videoFiles.length > 0) {
      const uploaded = await this.fileUploadService.uploadServiceFile(
        userId,
        serviceId,
        videoFiles,
        "video",
      );
      video = uploaded[0]; // Assuming only one video file is uploaded
    }

    const created = await this.prisma.service.create({
      data: {
        id: serviceId,
        serviceCode,
        ownerId: userId,
        title: dto.title,
        description: dto.description ?? null,
        price: dto.price != null ? Math.round(Number(dto.price)) : null,
        paymentType: (dto.paymentType ?? "fixed") as ServicePaymentType,
        requiresAppointment: dto.requiresAppointment ?? true,
        categoryId: dto.category,
        latitude,
        longitude,
        images,
        video,
        parameters: (dto.parameters || []) as unknown as Prisma.InputJsonValue,
      },
      include: { category: true },
    });

    this.sendServiceCreatedEmail(
      user.name,
      user.email,
      created.title,
      created.id,
      created.serviceCode,
    );

    return {
      message: this.i18n.translate("auth.services.created_success", { lang: this.lang }),
      data: this.toApiShape(created),
    };
  }

  async update(
    serviceId: string,
    dto: UpdateServiceDto,
    currentUser?: { sub: string; roles?: string[]; permissions?: PermissionEntry[] },
  ) {
    const clean: Record<string, any> = { ...dto };
    Object.keys(clean).forEach((key) => {
      if (clean[key] === "" || clean[key] === null || typeof clean[key] === "undefined") {
        delete clean[key];
      }
    });

    const existingService = await this.prisma.service.findFirst({
      where: { id: serviceId, isDeleted: false, isDisabled: false },
    });
    if (!existingService) {
      throw new NotFoundException("Service not found");
    }
    if (currentUser) {
      assertOwnerOrPermission(
        currentUser,
        existingService.ownerId ?? "",
        "services",
        "edit",
      );
    }

    const imageFiles = clean.images as Express.Multer.File[];
    let images = existingService.images; // Preserve existing images if not updated
    if (imageFiles && imageFiles.length > 0) {
      if (existingService.images && existingService.images.length > 4) {
        throw new BadRequestException("You can only upload up to 5 images");
      }
      const newImages = await this.fileUploadService.uploadServiceFile(
        existingService.ownerId,
        serviceId,
        imageFiles,
      );
      images = [...(existingService.images || []), ...newImages];
    }

    const videoFiles = clean.video as Express.Multer.File[];
    let video = existingService.video; // Preserve existing video if not updated
    if (videoFiles && videoFiles.length > 0) {
      const uploaded = await this.fileUploadService.uploadServiceFile(
        existingService.ownerId,
        serviceId,
        videoFiles,
        "video",
      );
      video = uploaded[0]; // Assuming only one video file is uploaded
    }

    const data: Prisma.ServiceUpdateInput = { images, video };
    if (clean.title !== undefined) data.title = clean.title;
    if (clean.description !== undefined) data.description = clean.description;
    if (clean.price !== undefined) data.price = Math.round(Number(clean.price));
    if (clean.paymentType !== undefined) {
      data.paymentType = clean.paymentType as ServicePaymentType;
    }
    if (clean.requiresAppointment !== undefined) {
      data.requiresAppointment = clean.requiresAppointment;
    }
    if (clean.category) data.category = { connect: { id: clean.category } };
    data.parameters = (clean.parameters ||
      existingService.parameters ||
      []) as unknown as Prisma.InputJsonValue;

    const updated = await this.prisma.service.update({
      where: { id: serviceId },
      data,
      include: { category: true },
    });

    return {
      message: this.i18n.translate("auth.services.updated_success", { lang: this.lang }),
      // The old version returned `{ ...dto, images, video }` — the request body,
      // not the saved row, so any server-side default or coercion was invisible
      // to the caller. This returns what was actually persisted.
      data: this.toApiShape(updated),
    };
  }

  async delete(
    serviceId: string,
    currentUser?: { sub: string; roles?: string[]; permissions?: PermissionEntry[] },
  ) {
    const existingService = await this.prisma.service.findFirst({
      where: { id: serviceId, isDeleted: false, isDisabled: false },
    });
    if (!existingService) {
      throw new NotFoundException(
        this.i18n.translate("auth.services.service_not_found", { lang: this.lang }),
      );
    }
    if (currentUser) {
      assertOwnerOrPermission(
        currentUser,
        existingService.ownerId ?? "",
        "services",
        "delete",
      );
    }

    const media: string[] = [...(existingService.images ?? [])];
    if (existingService.video) {
      media.push(existingService.video);
    }

    if (media.length > 0) {
      await this.fileUploadService.deleteFiles(media); // Delete associated media files
    }

    await this.prisma.service.update({
      where: { id: serviceId },
      // The old write set `imageUrls: []` — a field the schema never declared,
      // so Mongoose dropped it and the images array was never actually cleared.
      data: { isDeleted: true, images: [], video: "" },
    });

    return {
      status: 200,
      message: this.i18n.translate("auth.services.deleted_success", { lang: this.lang }),
    };
  }

  async deleteServiceMedia(
    serviceId: string,
    media: string[],
    currentUser?: { sub: string; roles?: string[]; permissions?: PermissionEntry[] },
  ) {
    const existingService = await this.prisma.service.findFirst({
      where: { id: serviceId, isDeleted: false, isDisabled: false },
    });
    if (!existingService) {
      throw new NotFoundException(
        this.i18n.translate("auth.services.service_not_found", { lang: this.lang }),
      );
    }
    if (!media || media.length === 0) {
      throw new BadRequestException(
        this.i18n.translate("auth.services.no_media_provided", { lang: this.lang }),
      );
    }
    if (currentUser) {
      assertOwnerOrPermission(
        currentUser,
        existingService.ownerId ?? "",
        "services",
        "edit",
      );
    }

    await this.fileUploadService.deleteFiles(media);

    const images = (existingService.images || []).filter(
      (imgUrl) => !media.includes(imgUrl),
    );
    const video =
      existingService.video && media.includes(existingService.video)
        ? ""
        : existingService.video;

    await this.prisma.service.update({
      where: { id: serviceId },
      data: { images, video },
    });

    return true;
  }

  async getById(serviceId: string, userId?: string): Promise<any> {
    const service = await this.prisma.service.findFirst({
      where: { id: serviceId, isDeleted: false, isDisabled: false },
      include: SERVICE_INCLUDE,
    });

    if (!service) {
      throw new NotFoundException(
        this.i18n.translate("auth.services.service_not_found", { lang: this.lang }),
      );
    }

    const [listingAnalytics, likesCount] = await Promise.all([
      this.getServiceAnalytics(serviceId),
      this.likeService.getLikeCount(serviceId, "service"),
    ]);

    const shaped = this.toApiShape(service);

    if (!userId) return { ...shaped, ...listingAnalytics, likesCount };

    const [isLiked, userReview] = await Promise.all([
      this.likeService.isLiked(userId, serviceId, "service"),
      this.reviewService.findOne(userId, serviceId, "service"),
    ]);

    return {
      ...shaped,
      ...listingAnalytics,
      likesCount,
      isLiked: !!isLiked,
      userReview: userReview || null,
    };
  }

  /** Real-value counterpart to the admin Service detail modal's "Service Analytics" tiles —
   *  Total Views / Unique Visitors both read off the same day-deduped ServiceView table
   *  (Total Views = row count, Unique Visitors = distinct userId count), Contact/WhatsApp
   *  Clicks read off their own lifetime-deduped tables. No raw counters anywhere. */
  private async getServiceAnalytics(serviceId: string) {
    const [totalViews, uniqueVisitors, contactClicks, whatsappClicks] = await Promise.all([
      this.prisma.serviceView.count({ where: { serviceId } }),
      this.prisma.serviceView.findMany({
        where: { serviceId },
        distinct: ["userId"],
        select: { userId: true },
      }),
      this.prisma.serviceContactClick.count({ where: { serviceId } }),
      this.prisma.serviceWhatsappClick.count({ where: { serviceId } }),
    ]);

    return {
      totalViews,
      uniqueVisitorsCount: uniqueVisitors.length,
      contactClicks,
      whatsappClicks,
    };
  }

  /**
   * Admin: paginated list of the distinct users who viewed one service, most
   * recent view first — powers the "who viewed this" drill-down on the admin
   * Feed page. ServiceView is day-deduped, so this groups by user first.
   */
  async getViewersForService(
    serviceId: string,
    page = 1,
    limit = 20,
  ): Promise<{
    data: unknown[];
    meta: { total: number; page: number; limit: number; totalPages: number };
  }> {
    const pageNum = Number(page) || 1;
    const limitNum = Number(limit) || 20;
    const skip = (pageNum - 1) * limitNum;

    const [groups, distinctCount] = await Promise.all([
      this.prisma.serviceView.groupBy({
        by: ["userId"],
        where: { serviceId },
        _max: { createdAt: true },
        orderBy: { _max: { createdAt: "desc" } },
        skip,
        take: limitNum,
      }),
      this.prisma.$queryRaw<{ count: bigint }[]>`
        SELECT count(DISTINCT user_id) AS count
        FROM service_views
        WHERE service_id = ${serviceId}
      `,
    ]);

    const users = await this.prisma.user.findMany({
      where: { id: { in: groups.map((g) => g.userId) } },
      select: { id: true, name: true, email: true, image: true },
    });
    const usersById = new Map(users.map((u) => [u.id, u]));

    const data = groups.map((g) => ({
      createdAt: g._max.createdAt,
      user: usersById.get(g.userId)
        ? { ...usersById.get(g.userId), _id: g.userId }
        : null,
    }));

    const total = Number(distinctCount[0]?.count ?? 0);

    return {
      data,
      meta: { total, page: pageNum, limit: limitNum, totalPages: Math.ceil(total / limitNum) },
    };
  }

  /**
   * The three tracking calls below were byte-identical apart from the table.
   * Each skips the service's own owner, and each dedupes so a count of rows is
   * the metric — views per (service, user, day), clicks per (service, user).
   */
  private async trackServiceEngagement(
    kind: "view" | "contactClick" | "whatsappClick",
    serviceId: string,
    userId: string,
  ): Promise<void> {
    if (!isObjectIdLike(serviceId) || !isObjectIdLike(userId)) return;

    const service = await this.prisma.service.findUnique({
      where: { id: serviceId },
      select: { ownerId: true },
    });
    if (!service || service.ownerId === userId) return;

    if (kind === "view") {
      const day = new Date().toISOString().slice(0, 10);
      await this.prisma.serviceView.upsert({
        where: { serviceId_userId_day: { serviceId, userId, day } },
        create: { id: generateObjectId(), serviceId, userId, day },
        update: {},
      });
      return;
    }

    const where = { serviceId_userId: { serviceId, userId } };
    const create = { id: generateObjectId(), serviceId, userId };

    if (kind === "contactClick") {
      await this.prisma.serviceContactClick.upsert({ where, create, update: {} });
    } else {
      await this.prisma.serviceWhatsappClick.upsert({ where, create, update: {} });
    }
  }

  /** Records a service view: day-deduped per (service, user). Skips the service's own owner. */
  async trackView(serviceId: string, userId: string): Promise<void> {
    return this.trackServiceEngagement("view", serviceId, userId);
  }

  /** Records a "Chat / Message Provider" click. Deduped per (service, user) forever. */
  async trackContactClick(serviceId: string, userId: string): Promise<void> {
    return this.trackServiceEngagement("contactClick", serviceId, userId);
  }

  /** Records a "WhatsApp" click. Deduped per (service, user) forever. */
  async trackWhatsappClick(serviceId: string, userId: string): Promise<void> {
    return this.trackServiceEngagement("whatsappClick", serviceId, userId);
  }

  async getByUser(
    userId: string,
    rawPage: number | string = 1,
    rawLimit: number | string = 10,
  ): Promise<PaginatedResponseDto<ServiceApi>> {
    const { page, limit, skip } = resolvePagination(rawPage, rawLimit);

    const where: Prisma.ServiceWhereInput = {
      ownerId: userId,
      isDeleted: false,
      isDisabled: false,
    };

    const [data, total] = await Promise.all([
      this.prisma.service.findMany({
        where,
        include: SERVICE_INCLUDE,
        orderBy: { createdAt: "desc" },
        skip,
        take: limit,
      }),
      this.prisma.service.count({ where }),
    ]);

    return {
      meta: { total, page, limit, totalPages: Math.ceil(total / limit) },
      data: data.map((s) => this.toApiShape(s)),
    };
  }

  async getAllForAdmin(
    paginationDto: PaginationDto,
    search?: string,
  ): Promise<PaginatedResponseDto<ServiceApi>> {
    const pageValue = Number(paginationDto.page);
    const limitValue = Number(paginationDto.limit);
    const page = Number.isInteger(pageValue) && pageValue > 0 ? pageValue : 1;
    const limit = Number.isInteger(limitValue) && limitValue > 0 ? limitValue : 10;
    const skip = (page - 1) * limit;

    const where: Prisma.ServiceWhereInput = {};

    if (search && search.trim()) {
      const term = search.trim();
      where.OR = [
        { title: { contains: term, mode: "insensitive" } },
        { description: { contains: term, mode: "insensitive" } },
        // As in products: the old dotted "category.name.en" paths never matched,
        // because category is a reference rather than an embedded document.
        { category: { name: { path: ["en"], string_contains: term } } },
        { category: { name: { path: ["ur"], string_contains: term } } },
      ];
    }

    const [items, total] = await Promise.all([
      this.prisma.service.findMany({
        where,
        include: SERVICE_INCLUDE,
        orderBy: { createdAt: "desc" },
        skip,
        take: limit,
      }),
      this.prisma.service.count({ where }),
    ]);

    return {
      meta: { total, page, limit, totalPages: Math.ceil(total / limit) },
      data: items.map((s) => this.toApiShape(s)),
    };
  }

  async updateStatus(serviceId: string, isDisabled: boolean) {
    const existing = await this.prisma.service.findUnique({ where: { id: serviceId } });
    if (!existing) {
      throw new NotFoundException(
        this.i18n.translate("auth.services.service_not_found", { lang: this.lang }),
      );
    }

    const updated = await this.prisma.service.update({
      where: { id: serviceId },
      data: { isDisabled },
    });

    return {
      message: isDisabled
        ? this.i18n.translate("auth.services.service_disabled_success", { lang: this.lang })
        : this.i18n.translate("auth.services.service_enabled_success", { lang: this.lang }),
      data: this.toApiShape(updated),
    };
  }

  async searchNearbyWithCategory(
    category: string,
    coordinates: [number, number],
    radius: number,
    pagination: PaginationDto,
  ) {
    return this.listingUtils.findNearbyWithCategory(
      "services",
      category,
      coordinates,
      radius,
      pagination,
    );
  }

  async searchNearbyServices(query: SearchNearbyServiceDto) {
    const longitude = Number(query.lng);
    const latitude = Number(query.lat);
    const radiusMeters = Number(query.radius) * 1000;
    const page = query.page && Number(query.page) > 0 ? Number(query.page) : 1;
    const limit = query.limit && Number(query.limit) > 0 ? Number(query.limit) : 10;
    const skip = (page - 1) * limit;

    const filters = [
      Prisma.sql`is_deleted = false`,
      Prisma.sql`is_disabled = false`,
      ...(query.category ? [Prisma.sql`category_id = ${query.category}`] : []),
    ];

    const { ids, distances, total } = await this.geoRepository.findNearby({
      table: "services",
      longitude,
      latitude,
      radiusMeters,
      filters,
      skip,
      take: limit,
      // The old pipeline re-sorted by createdAt after $geoNear.
      order: "newest",
    });

    if (ids.length === 0) {
      return {
        meta: { total, page, limit, totalPages: Math.ceil(total / limit) },
        data: [],
      };
    }

    const rows = await this.prisma.service.findMany({
      where: { id: { in: ids } },
      include: { category: true },
    });

    const results = GeoRepository.reorder(rows, ids).map((s) => ({
      ...this.toApiShape(s),
      distance: distances.get(s.id),
    }));

    const enrichedResults = await this.enrichServicesWithReviewStats(results);

    return {
      meta: { total, page, limit, totalPages: Math.ceil(total / limit) },
      data: enrichedResults,
    };
  }

  async setDisabledByOwner(ownerId: string, disabled: boolean) {
    await this.prisma.service.updateMany({
      where: { ownerId },
      data: { isDisabled: disabled },
    });
  }

  async searchServices(query: SearchAllProductsServiceDto) {
    const where: Prisma.ServiceWhereInput = {
      isDeleted: false,
      isDisabled: false,
    };

    if (query.name) {
      where.OR = [
        { title: { contains: query.name, mode: "insensitive" } },
        { serviceCode: { contains: query.name, mode: "insensitive" } },
      ];
    }
    if (query.category) {
      where.categoryId = query.category;
    }
    if (query.startDate || query.endDate) {
      const createdAt: Prisma.DateTimeFilter = {};
      if (query.startDate) createdAt.gte = new Date(query.startDate);
      if (query.endDate) {
        const endOfDay = new Date(query.endDate);
        endOfDay.setHours(23, 59, 59, 999);
        createdAt.lte = endOfDay;
      }
      where.createdAt = createdAt;
    }

    const page = query.page && Number(query.page) > 0 ? Number(query.page) : 1;
    const limit = query.limit && Number(query.limit) > 0 ? Number(query.limit) : 10;
    const skip = (page - 1) * limit;

    const [results, total] = await Promise.all([
      this.prisma.service.findMany({
        where,
        include: { category: true },
        orderBy: { createdAt: "desc" },
        skip,
        take: limit,
      }),
      this.prisma.service.count({ where }),
    ]);

    const enrichedResults = await this.enrichServicesWithReviewStats(
      results.map((s) => this.toApiShape(s)),
    );

    return {
      meta: { total, page, limit, totalPages: Math.ceil(total / limit) },
      data: enrichedResults,
    };
  }

  private async enrichServicesWithReviewStats(services: any[]) {
    if (!services || services.length === 0) {
      return services;
    }

    const serviceIds = services.map((service) => String(service.id ?? service._id));
    const reviewStats = await this.reviewService.getAverageRatingsForItems(
      serviceIds,
      "service",
    );

    const reviewMap = new Map(
      reviewStats.map((item) => [
        item._id,
        { avgRating: item.avgRating ?? 0, reviewCount: item.count ?? 0 },
      ]),
    );

    return services.map((service: any) => {
      const stats = reviewMap.get(String(service.id ?? service._id));
      return {
        ...service,
        averageRating: stats?.avgRating ? Number(stats.avgRating.toFixed(1)) : 0,
        reviewCount: stats?.reviewCount ?? 0,
      };
    });
  }

  async createServiceRequest(dto: CreateRequestDto) {
    const { serviceId, customerId, requestedDateTime, message } = dto;

    // --- Validation: User Existence ---
    const customer = customerId ? await this.userService.findUserById(customerId) : null;

    if (customerId && !customer)
      throw new NotFoundException(
        this.i18n.translate("auth.services.customer_not_found", { lang: this.lang }),
      );

    // --- Creation Flow ---
    if (!serviceId || !requestedDateTime || !customerId) {
      throw new BadRequestException("Missing required fields for request creation");
    }

    const service = await this.prisma.service.findUnique({
      where: { id: serviceId },
      include: { owner: { select: { id: true, name: true, email: true } } },
    });
    if (!service)
      throw new NotFoundException(
        this.i18n.translate("auth.services.service_not_found", { lang: this.lang }),
      );

    const jobCode = await this.generateNextJobCode();
    const results = await this.prisma.serviceRequest.create({
      data: {
        id: generateObjectId(),
        jobCode,
        serviceId,
        customerId,
        providerId: service.ownerId,
        requestedDateTime: new Date(requestedDateTime),
        status: "pending",
        jobStatus: "not_started",
        message: message ?? null,
      },
    });

    await this.notificationsService.createAndNotify(
      service.ownerId,
      "request_created",
      "SERVICE_REQUEST",
      { serviceId, customerId, requestedDateTime, actionType: "recieved" },
      { serviceName: service.title, customerName: customer?.name || "A customer" },
    );

    return {
      data: this.withLegacyId(results),
      message: this.i18n.translate("auth.services.request_created_success", {
        lang: this.lang,
      }),
    };
  }

  async updateRequestStatus(dto: UpdateRequestStatusDto) {
    const { requestId, action, proposedDateTime } = dto;

    const request = await this.prisma.serviceRequest.findUnique({
      where: { id: requestId },
      include: {
        service: true,
        customer: { select: { id: true, name: true, email: true } },
        provider: { select: { id: true, name: true, email: true } },
      },
    });

    if (!request)
      throw new NotFoundException(
        this.i18n.translate("auth.services.request_not_found", { lang: this.lang }),
      );

    const serviceName = request.service?.title || "service";
    const currentRequestStatus = request.status;

    // 1. Prepare variables at the top
    let notificationKey: string | null = null;
    let recipientId: string = request.customerId;
    let shouldSendBookingAcceptedEmail = false;
    const notificationPayload: Record<string, unknown> = {
      requestId: request.id,
      action,
      request,
      actionType: "recieved",
    };

    const data: Prisma.ServiceRequestUpdateInput = {};

    // 2. The Switch logic (ONLY decides the new status and the message key)
    switch (action) {
      case "accept":
        if (currentRequestStatus === "proposed") {
          data.status = "confirmed";
          recipientId = request.providerId;
          notificationKey = "request_confirmed";
          Object.assign(notificationPayload, {
            proposedDate: request.proposedDateTime?.toISOString() || proposedDateTime,
          });
        } else {
          data.status = "accepted";
          notificationKey = "request_accepted";
          shouldSendBookingAcceptedEmail = true;
        }
        break;

      case "reject":
        data.status = "rejected";
        notificationKey = "request_rejected";
        if (currentRequestStatus === "proposed") {
          recipientId = request.providerId;
        }
        break;

      case "cancel":
        data.status = "cancelled";
        recipientId = request.providerId; // Switch recipient
        notificationKey = "request_cancelled";
        break;

      case "propose":
        if (!proposedDateTime) {
          throw new BadRequestException(
            this.i18n.translate("auth.services.unsupported_action", { lang: this.lang }),
          );
        }

        data.status = "proposed";
        data.proposedDateTime = new Date(proposedDateTime);
        notificationKey = "request_proposed";
        Object.assign(notificationPayload, { proposedDate: proposedDateTime });
        break;

      case "confirm":
        if (currentRequestStatus !== "proposed") {
          throw new BadRequestException(
            this.i18n.translate("auth.services.invalid_confirm_action"),
          );
        }

        data.status = "confirmed";
        recipientId = request.providerId;
        notificationKey = "request_confirmed";
        Object.assign(notificationPayload, {
          proposedDate: request.proposedDateTime?.toISOString() || proposedDateTime,
        });
        break;

      default:
        throw new BadRequestException(
          this.i18n.translate("auth.services.unsupported_action"),
        );
    }

    // 3. Perform the DB Operation (The Source of Truth)
    await this.prisma.serviceRequest.update({ where: { id: requestId }, data });

    // 4. Dispatch Notification (Only if save succeeded and we have a key)
    if (notificationKey) {
      await this.notificationsService.createAndNotify(
        recipientId,
        notificationKey,
        "SERVICE_REQUEST",
        notificationPayload,
        { serviceName },
      );
    }

    if (shouldSendBookingAcceptedEmail) {
      const customer = request.customer;
      if (customer?.email) {
        this.sendBookingAcceptedEmail(
          customer.name ?? "",
          customer.email,
          serviceName,
          request.jobCode,
        );
      }
    }

    return {
      status: 201,
      message: this.i18n.translate("auth.services.request_status_updated", {
        lang: this.lang,
      }),
      data: { requestId },
    };
  }

  async updateJobStatus(dto: UpdateJobStatusDto) {
    const { requestId, action } = dto;

    const request = await this.prisma.serviceRequest.findUnique({
      where: { id: requestId },
    });
    if (!request) throw new NotFoundException("Request not found");

    const data: Prisma.ServiceRequestUpdateInput = {};

    switch (action) {
      case "start_job": {
        // Check if provider already has another in_progress job
        const existingInProgress = await this.prisma.serviceRequest.findFirst({
          where: {
            id: { not: request.id },
            providerId: request.providerId,
            jobStatus: "in_progress",
          },
          select: { id: true },
        });

        if (existingInProgress) {
          throw new BadRequestException(
            this.i18n.translate("auth.services.provider_has_in_progress_job", {
              lang: this.lang,
            }),
          );
        }

        data.jobStatus = "in_progress";
        data.status = "accepted";
        data.startedAt = new Date();
        break;
      }

      case "complete_job":
        data.status = "accepted"; // keep it consistent
        data.jobStatus = "completed";
        data.completedAt = new Date();
        break;

      default:
        throw new BadRequestException(
          this.i18n.translate("auth.services.unsupported_job_action", { lang: this.lang }),
        );
    }

    const result = await this.prisma.serviceRequest.update({
      where: { id: requestId },
      data,
    });

    return {
      status: 201,
      message: this.i18n.translate("auth.services.job_status_updated", {
        lang: this.lang,
        args: { jobStatus: result.jobStatus },
      }),
      data: { requestId: result.id, jobStatus: result.jobStatus },
    };
  }

  async getServiceRequestsByUser(
    userId: string,
    role: "customer" | "provider",
    rawPage: number | string = 1,
    rawLimit: number | string = 10,
    jobStatus?: string,
    status?: string,
  ): Promise<PaginatedResponseDto<ServiceRequest>> {
    const { page, limit, skip } = resolvePagination(rawPage, rawLimit);

    if (role !== "customer" && role !== "provider") {
      throw new BadRequestException(
        "Invalid role value. Expected 'customer' or 'provider'.",
      );
    }

    const where: Prisma.ServiceRequestWhereInput =
      role === "customer" ? { customerId: userId } : { providerId: userId };

    if (jobStatus) where.jobStatus = jobStatus as JobStatus;
    if (status) where.status = status as RequestStatus;

    const [requests, total] = await Promise.all([
      this.prisma.serviceRequest.findMany({
        where,
        include: { service: true, customer: true, provider: true },
        orderBy: { createdAt: "desc" },
        skip,
        take: limit,
      }),
      this.prisma.serviceRequest.count({ where }),
    ]);

    if (!requests || requests.length === 0) {
      throw new NotFoundException(
        this.i18n.translate("auth.services.no_requests_found", { lang: this.lang }),
      );
    }

    return {
      meta: { total, page, limit, totalPages: Math.ceil(total / limit) },
      data: requests.map((r) => this.withLegacyId(r)) as unknown as ServiceRequest[],
    };
  }

  /** Plain count, unlike getServiceRequestsByUser which throws NotFoundException on an empty result. */
  async countServiceRequestsByUser(
    userId: string,
    role: "customer" | "provider",
  ): Promise<number> {
    return this.prisma.serviceRequest.count({
      where: role === "customer" ? { customerId: userId } : { providerId: userId },
    });
  }

  private computeBookingStatus(status?: string, jobStatus?: string): BookingStatus {
    return computeBookingStatus(status, jobStatus);
  }

  async getAllServiceRequests(
    page = 1,
    limit = 10,
    search?: string,
    bookingStatus?: string,
    startDate?: string,
    endDate?: string,
  ): Promise<PaginatedResponseDto<any>> {
    const pageNum = Number(page) || 1;
    const limitNum = Number(limit) || 10;
    const skip = (pageNum - 1) * limitNum;

    // Was a $lookup x3 + $addFields($switch) + $match + $facet pipeline. The
    // derived bookingStatus becomes an equivalent set of column predicates (see
    // bookingStatusFilter), and the joins become relation filters.
    const where: Prisma.ServiceRequestWhereInput = {};

    const bucket = bookingStatus?.trim().toLowerCase();
    if (bucket) {
      Object.assign(where, bookingStatusFilter(bucket as BookingStatus));
    }

    if (search?.trim()) {
      const term = search.trim();
      where.OR = [
        { jobCode: { contains: term, mode: "insensitive" } },
        { customer: { name: { contains: term, mode: "insensitive" } } },
        { provider: { name: { contains: term, mode: "insensitive" } } },
        { service: { title: { contains: term, mode: "insensitive" } } },
      ];
    }

    if (startDate || endDate) {
      const createdAt: Prisma.DateTimeFilter = {};
      if (startDate) createdAt.gte = new Date(startDate);
      if (endDate) {
        const endOfDay = new Date(endDate);
        endOfDay.setHours(23, 59, 59, 999);
        createdAt.lte = endOfDay;
      }
      where.createdAt = createdAt;
    }

    const [rows, total] = await Promise.all([
      this.prisma.serviceRequest.findMany({
        where,
        orderBy: { createdAt: "desc" },
        skip,
        take: limitNum,
        select: {
          id: true,
          jobCode: true,
          status: true,
          jobStatus: true,
          requestedDateTime: true,
          proposedDateTime: true,
          createdAt: true,
          customer: { select: { id: true, name: true } },
          provider: { select: { id: true, name: true } },
          service: { select: { id: true, title: true } },
        },
      }),
      this.prisma.serviceRequest.count({ where }),
    ]);

    // The old $project emitted the joins as customerInfo/providerInfo/serviceInfo.
    const data = rows.map(({ customer, provider, service, ...rest }) => ({
      ...rest,
      _id: rest.id,
      bookingStatus: computeBookingStatus(rest.status, rest.jobStatus),
      customerInfo: customer ? { ...customer, _id: customer.id } : null,
      providerInfo: provider ? { ...provider, _id: provider.id } : null,
      serviceInfo: service ? { ...service, _id: service.id } : null,
    }));

    return {
      data,
      meta: {
        total,
        page: pageNum,
        limit: limitNum,
        totalPages: Math.ceil(total / limitNum),
      },
    };
  }

  async getServiceRequestStatusCounts(startDate?: string, endDate?: string) {
    const dateWhere: Prisma.ServiceRequestWhereInput = {};
    if (startDate || endDate) {
      const createdAt: Prisma.DateTimeFilter = {};
      if (startDate) createdAt.gte = new Date(startDate);
      if (endDate) {
        const endOfDay = new Date(endDate);
        endOfDay.setHours(23, 59, 59, 999);
        createdAt.lte = endOfDay;
      }
      dateWhere.createdAt = createdAt;
    }

    // Four counts against the same predicates the $switch used. Doing it this
    // way keeps the bucket definitions in one place (bookingStatusFilter) rather
    // than duplicating the $switch in a second pipeline.
    const [pending, accepted, completed, cancelled] = await Promise.all([
      this.prisma.serviceRequest.count({
        where: { ...dateWhere, ...bookingStatusFilter("pending") },
      }),
      this.prisma.serviceRequest.count({
        where: { ...dateWhere, ...bookingStatusFilter("accepted") },
      }),
      this.prisma.serviceRequest.count({
        where: { ...dateWhere, ...bookingStatusFilter("completed") },
      }),
      this.prisma.serviceRequest.count({
        where: { ...dateWhere, ...bookingStatusFilter("cancelled") },
      }),
    ]);

    return {
      data: {
        total: pending + accepted + completed + cancelled,
        pending,
        accepted,
        completed,
        cancelled,
      },
    };
  }

  async getServiceRequestDetail(requestId: string) {
    if (!isObjectIdLike(requestId)) {
      throw new BadRequestException("Invalid booking id");
    }

    const request = await this.prisma.serviceRequest.findUnique({
      where: { id: requestId },
      include: {
        service: { select: { id: true, title: true, price: true, paymentType: true, images: true } },
        customer: { select: { id: true, name: true, email: true, phone: true } },
        provider: { select: { id: true, name: true, email: true, phone: true } },
      },
    });

    if (!request) {
      throw new NotFoundException("Booking not found");
    }

    return {
      data: {
        ...this.withLegacyId(request),
        bookingStatus: this.computeBookingStatus(request.status, request.jobStatus),
      },
    };
  }

  async deleteAllServiceMedia(serviceId: string, media: string[]) {
    const service = await this.prisma.service.findUnique({ where: { id: serviceId } });
    if (!service) {
      throw new NotFoundException(
        this.i18n.translate("auth.services.service_not_found", { lang: this.lang }),
      );
    }
    if (!media || media.length === 0) {
      throw new BadRequestException(
        this.i18n.translate("auth.services.no_media_provided", { lang: this.lang }),
      );
    }

    await this.fileUploadService.deleteFiles(media);

    const images = (service.images || []).filter((imgUrl) => !media.includes(imgUrl));
    const video = service.video && media.includes(service.video) ? "" : service.video;

    await this.prisma.service.update({
      where: { id: serviceId },
      data: { images, video },
    });

    return {
      message: this.i18n.translate("auth.services.media_deleted_success", {
        lang: this.lang,
      }),
    };
  }

  async getServicesWithVideos(
    paginationDto: PaginationDto,
    userId?: string,
    category?: string,
  ): Promise<PaginatedResponseDto<ServiceApi>> {
    const pageValue = Number(paginationDto.page);
    const limitValue = Number(paginationDto.limit);
    const page = Number.isInteger(pageValue) && pageValue > 0 ? pageValue : 1;
    const limit = Number.isInteger(limitValue) && limitValue > 0 ? limitValue : 10;
    const skip = (page - 1) * limit;

    const where: Prisma.ServiceWhereInput = {
      ...HAS_VIDEO,
      isDeleted: false,
      isDisabled: false,
    };
    if (category) {
      where.categoryId = category;
    }

    const [items, total] = await Promise.all([
      this.prisma.service.findMany({
        where,
        include: SERVICE_INCLUDE,
        orderBy: { createdAt: "desc" },
        skip,
        take: limit,
      }),
      this.prisma.service.count({ where }),
    ]);

    const shaped = items.map((s) => this.toApiShape(s));
    const itemIds = shaped.map((item) => item.id as string);
    const [likeCounts, shareCounts] = await Promise.all([
      this.likeService.getLikeCountsForItems(itemIds, "service"),
      this.shareService.getShareCountsForItems(itemIds, "service"),
    ]);

    if (!userId) {
      return {
        meta: { total, page, limit, totalPages: Math.ceil(total / limit) },
        data: shaped.map((item) => ({
          ...item,
          likesCount: likeCounts.get(item.id) ?? 0,
          sharesCount: shareCounts.get(item.id) ?? 0,
        })),
      };
    }

    const user = await this.userService.findUserById(userId);
    if (!user) {
      throw new NotFoundException(
        this.i18n.translate("auth.users.user_not_found", { lang: this.lang }),
      );
    }

    const likes = await this.likeService.getLikesByUser(userId, "service", itemIds);
    const likedServiceIds = new Set(likes.map((like) => like.itemId));

    const data = shaped.map((item) => ({
      ...item,
      isLiked: likedServiceIds.has(item.id),
      likesCount: likeCounts.get(item.id) ?? 0,
      sharesCount: shareCounts.get(item.id) ?? 0,
    }));

    return {
      meta: { total, page, limit, totalPages: Math.ceil(total / limit) },
      data,
    };
  }

  async getServicesRequestsForCustomer(
    customerId: string,
    paginationDto: PaginationDto,
    jobStatus?: string,
    status?: string,
  ): Promise<PaginatedResponseDto<ServiceRequest>> {
    const pageValue = Number(paginationDto.page);
    const limitValue = Number(paginationDto.limit);
    const page = Number.isInteger(pageValue) && pageValue > 0 ? pageValue : 1;
    const limit = Number.isInteger(limitValue) && limitValue > 0 ? limitValue : 10;
    const skip = (page - 1) * limit;

    const existingCustomer = await this.userService.findUserById(customerId);
    if (!existingCustomer) {
      throw new NotFoundException(
        this.i18n.translate("auth.users.user_not_found", { lang: this.lang }),
      );
    }

    const where: Prisma.ServiceRequestWhereInput = { customerId };

    if (jobStatus) where.jobStatus = jobStatus as JobStatus;
    if (status) {
      where.status = status.includes(",")
        ? { in: status.split(",") as RequestStatus[] }
        : (status as RequestStatus);
    }

    const [requests, total] = await Promise.all([
      this.prisma.serviceRequest.findMany({
        where,
        include: {
          provider: { select: { id: true, name: true, email: true } },
          customer: { select: { id: true, name: true, email: true } },
          service: { include: { category: true } },
        },
        orderBy: { createdAt: "desc" },
        skip,
        take: limit,
      }),
      this.prisma.serviceRequest.count({ where }),
    ]);

    // Per-booking, not per-service — a customer can book (and review) the same service more
    // than once, and each booking gets its own independent review slot.
    const requestIds = requests.map((request) => request.id);
    const reviewedRequestIds = await this.reviewService.getReviewedRequestIdsForUser(
      customerId,
      requestIds,
    );
    const data = requests.map((request) => ({
      ...this.withLegacyId(request),
      alreadyReviewed: reviewedRequestIds.has(request.id),
    }));

    return {
      meta: { total, page, limit, totalPages: Math.ceil(total / limit) },
      data: data as unknown as ServiceRequest[],
    };
  }

  /**
   * Check whether a user is eligible to review a service.
   * Returns flags and message explaining the reason.
   */
  async checkReviewEligibility(userId: string, serviceId: string) {
    if (!userId) throw new BadRequestException("userId is required");

    // 1) Find this user's most recent booking of this service — per-booking review scope, so
    // eligibility (and the review itself, once submitted) is tied to that specific booking.
    const request = await this.prisma.serviceRequest.findFirst({
      where: { serviceId, customerId: userId },
      orderBy: { createdAt: "desc" },
    });

    if (!request) {
      return {
        data: { canReview: false, notBooked: true },
        message: this.i18n.translate("auth.services.no_requests_found", {
          lang: this.lang,
        }),
      };
    }

    // Only allow review if request was accepted/confirmed
    const acceptedStatuses = ["accepted", "confirmed"];
    if (!acceptedStatuses.includes(request.status)) {
      return {
        data: {
          canReview: false,
          notAccepted: true,
          requestStatus: request.status,
        },
        message:
          this.i18n.translate("auth.services.request_not_accepted", {
            lang: this.lang,
          }) || "Service request has not been accepted",
      };
    }

    // 2) Check if this specific booking already has a review — not "has this user ever
    // reviewed this service", since the same service can be booked (and reviewed) again.
    const existingReview = await this.reviewService.findOneByRequest(userId, request.id);
    if (existingReview) {
      return {
        data: { canReview: false, alreadyReviewed: true, requestId: request.id },
        message: this.i18n.translate("auth.reviews.duplicate_review", {
          lang: this.lang,
        }),
      };
    }

    return {
      data: { canReview: true, requestId: request.id },
      message: "User is eligible to review",
    };
  }
}
