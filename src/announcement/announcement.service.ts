import { BadRequestException, Injectable, NotFoundException } from "@nestjs/common";

import { PrismaService } from "src/prisma/prisma.service";
import { generateObjectId, isObjectIdLike } from "src/common/utils/object-id.util";
import { CreateAnnouncementDto } from "./dto/create-announcement.dto";
import { PaginatedResponseDto } from "src/common/dto/pagination-response.dto";
import { PaginationDto } from "src/common/dto/pagination.dto";
import { UsersService } from "src/users/users.service";
import { NotificationsService } from "src/notifications/notifications.service";
import {
  ANNOUNCEMENT_PRIORITIES,
  ANNOUNCEMENT_STATUSES,
  STATUS_MESSAGE,
  type Announcement,
  type AnnouncementPriority,
  type AnnouncementStatus,
} from "./model/announcement.model";
import { resolvePagination } from "../common/utils/pagination.util";

@Injectable()
export class AnnouncementService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly usersService: UsersService,
    private readonly notificationsService: NotificationsService,
  ) {}

  /** Atomically reserves the next sequential announcement code (e.g. ANN-000001). */
  private async generateNextAnnouncementCode(): Promise<string> {
    const counter = await this.prisma.counter.upsert({
      where: { id: "announcementCode" },
      create: { id: "announcementCode", seq: 1 },
      update: { seq: { increment: 1 } },
    });
    return `ANN-${String(counter.seq).padStart(6, "0")}`;
  }

  /** Fans out a sent announcement to targeted users: in-app notification, realtime socket, and push. */
  private async fanOutToUsers(announcement: Announcement, roles?: string[]) {
    const userIds = await this.usersService.getUserIdsByRoles(roles);

    const payload = {
      announcementId: announcement.id,
      announcementCode: announcement.announcementCode,
      title: announcement.title,
      image: announcement.image,
      video: announcement.video,
      ctaLabel: announcement.ctaLabel,
      ctaDestination: announcement.ctaDestination,
      priority: announcement.priority,
      location: announcement.location,
      category: announcement.categoryId ?? undefined,
      expiresAt: announcement.expiresAt,
    };

    await Promise.allSettled(
      userIds.map((userId) =>
        this.notificationsService.notifyRaw(
          String(userId),
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
    if (!(ANNOUNCEMENT_STATUSES as readonly string[]).includes(status)) {
      throw new BadRequestException("Invalid status");
    }
    if (status === "scheduled" && !dto.scheduledAt) {
      throw new BadRequestException(
        "Schedule date & time is required when scheduling an announcement",
      );
    }

    if (dto.priority && !(ANNOUNCEMENT_PRIORITIES as readonly string[]).includes(dto.priority)) {
      throw new BadRequestException("Invalid priority");
    }

    if (dto.category && !isObjectIdLike(dto.category)) {
      throw new BadRequestException("Invalid category id");
    }

    return { title, message, status: status as AnnouncementStatus };
  }

  async create(dto: CreateAnnouncementDto, createdBy: string) {
    const { title, message, status } = this.validateDto(dto, "sent");

    const announcementCode = await this.generateNextAnnouncementCode();

    const announcement = await this.prisma.announcement.create({
      data: {
        id: generateObjectId(),
        announcementCode,
        title,
        message,
        image: dto.image ?? null,
        video: dto.video ?? null,
        targetAudience: dto.targetAudience ?? [],
        categoryId: dto.category || null,
        location: dto.location?.trim() || null,
        ctaLabel: dto.ctaLabel?.trim() || null,
        ctaDestination: dto.ctaDestination?.trim() || null,
        scheduledAt: dto.scheduledAt ? new Date(dto.scheduledAt) : null,
        expiresAt: dto.expiresAt ? new Date(dto.expiresAt) : null,
        priority: (dto.priority ?? "medium") as AnnouncementPriority,
        status,
        sentAt: status === "sent" ? new Date() : null,
        createdById: createdBy,
      },
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
    if (!isObjectIdLike(id)) {
      throw new BadRequestException("Invalid announcement id");
    }

    const existing = await this.prisma.announcement.findUnique({ where: { id } });
    if (!existing) {
      throw new NotFoundException("Announcement not found");
    }
    if (existing.status !== "draft") {
      throw new BadRequestException("Only draft announcements can be edited");
    }

    const { title, message, status } = this.validateDto(dto, "draft");

    const announcement = await this.prisma.announcement.update({
      where: { id },
      data: {
        title,
        message,
        // image/video are only overwritten when a new one is supplied, so an
        // edit that leaves them out keeps the existing media — unchanged.
        ...(dto.image ? { image: dto.image } : {}),
        ...(dto.video ? { video: dto.video } : {}),
        targetAudience: dto.targetAudience ?? [],
        categoryId: dto.category || null,
        location: dto.location?.trim() || null,
        ctaLabel: dto.ctaLabel?.trim() || null,
        ctaDestination: dto.ctaDestination?.trim() || null,
        scheduledAt: dto.scheduledAt ? new Date(dto.scheduledAt) : null,
        expiresAt: dto.expiresAt ? new Date(dto.expiresAt) : null,
        priority: (dto.priority ?? "medium") as AnnouncementPriority,
        status,
        ...(status === "sent" ? { sentAt: new Date() } : {}),
      },
    });

    if (status === "sent") {
      await this.fanOutToUsers(announcement, announcement.targetAudience);
    }

    return {
      message: STATUS_MESSAGE[status],
      data: announcement,
    };
  }

  async getAll(paginationDto: PaginationDto): Promise<PaginatedResponseDto<Announcement>> {
    const { page: rawPage, limit: rawLimit } = paginationDto;
    const { page, limit, skip } = resolvePagination(rawPage, rawLimit);

    const [data, total] = await Promise.all([
      this.prisma.announcement.findMany({
        orderBy: { createdAt: "desc" },
        skip,
        take: limit,
        include: {
          createdBy: { select: { id: true, name: true, email: true } },
          category: { select: { id: true, name: true } },
        },
      }),
      this.prisma.announcement.count(),
    ]);

    return {
      data: data as unknown as Announcement[],
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
    if (!isObjectIdLike(announcementId)) return;

    const day = new Date().toISOString().slice(0, 10);

    // Was updateOne(..., { $setOnInsert }, { upsert: true }); `update: {}` leaves
    // an existing row untouched in exactly the same way.
    await this.prisma.announcementView.upsert({
      where: {
        announcementId_userId_day: { announcementId, userId, day },
      },
      create: { id: generateObjectId(), announcementId, userId, day },
      update: {},
    });
  }

  /** Admin: paginated list of the distinct users who viewed one announcement, most recent
   *  view first — powers the "who viewed this" drill-down on the admin Announcements page. */
  async getViewersForAnnouncement(
    announcementId: string,
    page = 1,
    limit = 20,
  ): Promise<{
    data: unknown[];
    meta: { total: number; page: number; limit: number; totalPages: number };
  }> {
    const pageNum = Number(page) || 1;
    const limitNum = Number(limit) || 20;
    const skip = (pageNum - 1) * limitNum;

    // Was a $group by userId taking $max(createdAt), then a $lookup into users
    // and a second $count pipeline. groupBy does the first half; the users are
    // fetched once for the page rather than joined per row.
    const [groups, distinctCount] = await Promise.all([
      this.prisma.announcementView.groupBy({
        by: ["userId"],
        where: { announcementId },
        _max: { createdAt: true },
        orderBy: { _max: { createdAt: "desc" } },
        skip,
        take: limitNum,
      }),
      this.prisma.$queryRaw<{ count: bigint }[]>`
        SELECT count(DISTINCT user_id) AS count
        FROM announcement_views
        WHERE announcement_id = ${announcementId}
      `,
    ]);

    const users = await this.prisma.user.findMany({
      where: { id: { in: groups.map((g) => g.userId) } },
      select: { id: true, name: true, email: true, image: true },
    });
    const usersById = new Map(users.map((u) => [u.id, u]));

    // Same output shape as the old $project: { createdAt, user }.
    const data = groups.map((g) => ({
      createdAt: g._max.createdAt,
      user: usersById.get(g.userId) ?? null,
    }));

    const total = Number(distinctCount[0]?.count ?? 0);

    return {
      data,
      meta: { total, page: pageNum, limit: limitNum, totalPages: Math.ceil(total / limitNum) },
    };
  }
}
