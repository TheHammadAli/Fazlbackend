import { BadRequestException, Injectable, NotFoundException } from "@nestjs/common";
import { InjectModel } from "@nestjs/mongoose";
import { Model, Types } from "mongoose";

import { Announcement } from "./schema/announcement.schema";
import { AnnouncementView, AnnouncementViewDocument } from "./schema/announcement-view.schema";
import { Counter, CounterDocument } from "src/common/schema/counter.schema";
import { CreateAnnouncementDto } from "./dto/create-announcement.dto";
import { PaginatedResponseDto } from "src/common/dto/pagination-response.dto";
import { PaginationDto } from "src/common/dto/pagination.dto";
import { UsersService } from "src/users/users.service";
import { NotificationsService } from "src/notifications/notifications.service";

const STATUS_MESSAGE: Record<string, string> = {
  sent: "Announcement sent successfully",
  scheduled: "Announcement scheduled successfully",
  draft: "Announcement saved as draft",
};

@Injectable()
export class AnnouncementService {
  constructor(
    @InjectModel(Announcement.name)
    private readonly announcementModel: Model<Announcement>,
    @InjectModel(Counter.name)
    private readonly counterModel: Model<CounterDocument>,
    @InjectModel(AnnouncementView.name)
    private readonly announcementViewModel: Model<AnnouncementViewDocument>,
    private readonly usersService: UsersService,
    private readonly notificationsService: NotificationsService,
  ) {}

  /** Atomically reserves the next sequential announcement code (e.g. ANN-000001). */
  private async generateNextAnnouncementCode(): Promise<string> {
    const counter = await this.counterModel.findByIdAndUpdate(
      "announcementCode",
      { $inc: { seq: 1 } },
      { new: true, upsert: true },
    );
    return `ANN-${String(counter.seq).padStart(6, "0")}`;
  }

  /** Fans out a sent announcement to targeted users: in-app notification, realtime socket, and push. */
  private async fanOutToUsers(announcement: Announcement, roles?: string[]) {
    const userIds = await this.usersService.getUserIdsByRoles(roles);

    const payload = {
      announcementId: (announcement as any)._id?.toString?.(),
      announcementCode: announcement.announcementCode,
      title: announcement.title,
      image: announcement.image,
      video: announcement.video,
      ctaLabel: announcement.ctaLabel,
      ctaDestination: announcement.ctaDestination,
      priority: announcement.priority,
      location: announcement.location,
      category: announcement.category?.toString?.(),
      expiresAt: announcement.expiresAt,
    };

    await Promise.allSettled(
      userIds.map((userId) =>
        this.notificationsService.notifyRaw(
          userId,
          announcement.title,
          announcement.message,
          "ANNOUNCEMENT",
          payload,
        ),
      ),
    );
  }

  // No global ValidationPipe is registered in this app, so class-validator decorators on the
  // DTO are documentation only, not enforcement — this must be checked explicitly at runtime.
  private validateDto(dto: CreateAnnouncementDto, defaultStatus: "draft" | "sent") {
    const title = dto.title?.trim();
    const message = dto.message?.trim();
    if (!title || !message) {
      throw new BadRequestException("Title and message are required");
    }

    const status = dto.status ?? defaultStatus;
    if (!["draft", "scheduled", "sent"].includes(status)) {
      throw new BadRequestException("Invalid status");
    }
    if (status === "scheduled" && !dto.scheduledAt) {
      throw new BadRequestException("Schedule date & time is required when scheduling an announcement");
    }

    if (dto.priority && !["low", "medium", "high"].includes(dto.priority)) {
      throw new BadRequestException("Invalid priority");
    }

    if (dto.category && !Types.ObjectId.isValid(dto.category)) {
      throw new BadRequestException("Invalid category id");
    }

    return { title, message, status };
  }

  async create(dto: CreateAnnouncementDto, createdBy: string) {
    const { title, message, status } = this.validateDto(dto, "sent");

    const announcementCode = await this.generateNextAnnouncementCode();

    const announcement = await this.announcementModel.create({
      announcementCode,
      title,
      message,
      image: dto.image,
      video: dto.video,
      targetAudience: dto.targetAudience ?? [],
      category: dto.category ? new Types.ObjectId(dto.category) : undefined,
      location: dto.location?.trim() || undefined,
      ctaLabel: dto.ctaLabel?.trim() || undefined,
      ctaDestination: dto.ctaDestination?.trim() || undefined,
      scheduledAt: dto.scheduledAt ? new Date(dto.scheduledAt) : undefined,
      expiresAt: dto.expiresAt ? new Date(dto.expiresAt) : undefined,
      priority: dto.priority ?? "medium",
      status,
      sentAt: status === "sent" ? new Date() : undefined,
      createdBy: new Types.ObjectId(createdBy),
    });

    if (status === "sent") {
      await this.fanOutToUsers(announcement, announcement.targetAudience);
    }

    return {
      message: STATUS_MESSAGE[status],
      data: announcement,
    };
  }

  /** Only drafts can be edited — scheduled/sent announcements are treated as final. */
  async update(id: string, dto: CreateAnnouncementDto) {
    if (!Types.ObjectId.isValid(id)) {
      throw new BadRequestException("Invalid announcement id");
    }

    const announcement = await this.announcementModel.findById(id);
    if (!announcement) {
      throw new NotFoundException("Announcement not found");
    }
    if (announcement.status !== "draft") {
      throw new BadRequestException("Only draft announcements can be edited");
    }

    const { title, message, status } = this.validateDto(dto, "draft");

    announcement.title = title;
    announcement.message = message;
    if (dto.image) {
      announcement.image = dto.image;
    }
    if (dto.video) {
      announcement.video = dto.video;
    }
    announcement.targetAudience = dto.targetAudience ?? [];
    announcement.category = dto.category ? new Types.ObjectId(dto.category) : undefined;
    announcement.location = dto.location?.trim() || undefined;
    announcement.ctaLabel = dto.ctaLabel?.trim() || undefined;
    announcement.ctaDestination = dto.ctaDestination?.trim() || undefined;
    announcement.scheduledAt = dto.scheduledAt ? new Date(dto.scheduledAt) : undefined;
    announcement.expiresAt = dto.expiresAt ? new Date(dto.expiresAt) : undefined;
    announcement.priority = dto.priority ?? "medium";
    announcement.status = status;
    if (status === "sent") {
      announcement.sentAt = new Date();
    }

    await announcement.save();

    if (status === "sent") {
      await this.fanOutToUsers(announcement, announcement.targetAudience);
    }

    return {
      message: STATUS_MESSAGE[status],
      data: announcement,
    };
  }

  async getAll(paginationDto: PaginationDto): Promise<PaginatedResponseDto<Announcement>> {
    const { page = 1, limit = 10 } = paginationDto;
    const skip = (page - 1) * limit;

    const [data, total] = await Promise.all([
      this.announcementModel
        .find()
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .populate("createdBy", "name email")
        .populate("category", "name")
        .lean()
        .exec(),
      this.announcementModel.countDocuments(),
    ]);

    return {
      data,
      meta: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  /** Records that a user opened an announcement: day-deduped per (announcement, user) —
   *  reopening it later the same day never recounts, a later day does. */
  async trackView(announcementId: string, userId: string): Promise<void> {
    if (!Types.ObjectId.isValid(announcementId)) return;

    const day = new Date().toISOString().slice(0, 10);
    await this.announcementViewModel.updateOne(
      { announcementId: new Types.ObjectId(announcementId), userId: new Types.ObjectId(userId), day },
      {
        $setOnInsert: {
          announcementId: new Types.ObjectId(announcementId),
          userId: new Types.ObjectId(userId),
          day,
        },
      },
      { upsert: true },
    );
  }

  /** Admin: paginated list of the distinct users who viewed one announcement, most recent
   *  view first — powers the "who viewed this" drill-down on the admin Announcements page. */
  async getViewersForAnnouncement(
    announcementId: string,
    page = 1,
    limit = 20,
  ): Promise<{ data: unknown[]; meta: { total: number; page: number; limit: number; totalPages: number } }> {
    const pageNum = Number(page) || 1;
    const limitNum = Number(limit) || 20;
    const skip = (pageNum - 1) * limitNum;
    const match = { announcementId: new Types.ObjectId(announcementId) };

    const basePipeline: any[] = [
      { $match: match },
      { $group: { _id: "$userId", lastViewedAt: { $max: "$createdAt" } } },
      { $sort: { lastViewedAt: -1 } },
    ];

    const [rows, countResult] = await Promise.all([
      this.announcementViewModel.aggregate([
        ...basePipeline,
        { $skip: skip },
        { $limit: limitNum },
        {
          $lookup: {
            from: "users",
            localField: "_id",
            foreignField: "_id",
            as: "user",
          },
        },
        { $unwind: { path: "$user", preserveNullAndEmptyArrays: true } },
        {
          $project: {
            _id: 0,
            createdAt: "$lastViewedAt",
            "user._id": 1,
            "user.name": 1,
            "user.email": 1,
            "user.image": 1,
          },
        },
      ]),
      this.announcementViewModel.aggregate([...basePipeline, { $count: "total" }]),
    ]);

    const total = countResult[0]?.total ?? 0;

    return {
      data: rows,
      meta: { total, page: pageNum, limit: limitNum, totalPages: Math.ceil(total / limitNum) },
    };
  }
}
