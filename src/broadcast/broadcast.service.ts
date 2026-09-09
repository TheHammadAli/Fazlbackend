import {
  Injectable,
  Logger,
  NotFoundException,
  BadRequestException,
  ForbiddenException,
} from "@nestjs/common";
import { I18nService } from "nestjs-i18n";

import { CreateBroadcastDto } from "./dto/create-broadcast.dto";
import { PaginatedResponseDto } from "src/common/dto/pagination-response.dto";
import { PaginationDto } from "src/common/dto/pagination.dto";

import { ShopService } from "../shop/shop.service";
import { UsersService } from "src/users/users.service";
import { CategoryService } from "src/category/category.service";
import { ServicesService } from "src/services/services.service";
import { ProductsService } from "src/products/products.service";
import { NotificationsService } from "src/notifications/notifications.service";
import { ClsService } from "nestjs-cls";
import { BroadcastGateway } from "./broadcast.gateway";
import { EmailService } from "src/common/email-service/email-service";
import { EmailLogService } from "src/email-log/email-log.service";
import { PrismaService } from "src/prisma/prisma.service";
import { BroadcastRepository } from "src/prisma/repositories/broadcast.repository";
import { generateObjectId, isObjectIdLike } from "src/common/utils/object-id.util";
import { toLatLng, withGeoJson } from "src/common/utils/geo.util";
import {
  DEFAULT_BROADCAST_MESSAGE,
  type BroadcastPurpose,
  type BroadcastType,
} from "./model/broadcast.model";
import type { Prisma } from "../../generated/prisma/client";
import { resolvePagination } from "../common/utils/pagination.util";

@Injectable()
export class BroadcastService {
  private readonly logger = new Logger(BroadcastService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly broadcastRepository: BroadcastRepository,
    private readonly shopService: ShopService,
    private readonly categoryService: CategoryService,
    private readonly userService: UsersService,
    private readonly servicesService: ServicesService,
    private readonly productsService: ProductsService,
    private readonly notificationsService: NotificationsService,
    private readonly i18n: I18nService,
    private readonly cls: ClsService,
    private readonly broadcastGateway: BroadcastGateway,
    private readonly emailService: EmailService,
    private readonly emailLogService: EmailLogService,
  ) {}

  private get lang(): string {
    return this.cls.get("lang") || "en";
  }

  /** Clients read `_id`; Prisma rows carry `id`. */
  private withLegacyId<T extends { id: string }>(row: T): T & { _id: string } {
    return { ...row, _id: row.id };
  }

  /**
   * Rebuilds the broadcast shape clients expect: GeoJSON `location`, `_id`, and the
   * `buyer`/`category` field names the Mongoose schema used.
   *
   * Prisma splits each reference into an id column plus a relation (`buyerId` +
   * `buyer`), and only some queries load the relation. Mongoose exposed a single
   * field that held either the raw id or the populated document, and every client
   * reads that name — the web chat derives the whole broadcast thread from
   * `thread.buyer`, so leaving it undefined silently skips the messages query and
   * the conversation renders empty.
   */
  private toApiShape<T extends Record<string, any>>(broadcast: T | null): any {
    if (!broadcast) return broadcast;
    const shaped = withGeoJson(broadcast as any) as any;
    return {
      ...shaped,
      _id: shaped.id,
      buyer: shaped.buyer ?? shaped.buyerId,
      category: shaped.category ?? shaped.categoryId,
    };
  }

  /** Fire-and-forget: dispatching the broadcast must succeed even if the email provider is down. */
  private sendBroadcastCreatedEmail(
    name: string,
    email: string,
    broadcastCode?: string | null,
  ) {
    const broadcastUrl = `${process.env.FRONTEND_URL}/chat?tab=broadcast_messages&type=sent`;
    const html = `
      <h2>Your broadcast has been created</h2>
      <p>Hi ${name},</p>
      <p>Your broadcast request has been sent to nearby sellers. You'll be notified as replies come in.</p>
      <p><a href="${broadcastUrl}">${broadcastUrl}</a></p>
    `;
    this.emailService
      .sendEmail(email, "Your broadcast has been created", html)
      .then(() =>
        this.emailLogService.record({
          eventType: "broadcast_created",
          recipient: email,
          relatedRecordId: broadcastCode ?? undefined,
          deliveryStatus: "sent",
        }),
      )
      .catch((err) => {
        this.logger.error(`Broadcast-created email to ${email} failed`, err);
        void this.emailLogService.record({
          eventType: "broadcast_created",
          recipient: email,
          relatedRecordId: broadcastCode ?? undefined,
          deliveryStatus: "failed",
        });
      });
  }

  /** Atomically reserves the next sequential broadcast code (e.g. ECH-000001). */
  private async generateNextBroadcastCode(): Promise<string> {
    const counter = await this.prisma.counter.upsert({
      where: { id: "broadcastCode" },
      create: { id: "broadcastCode", seq: 1 },
      update: { seq: { increment: 1 } },
    });
    return `ECH-${String(counter.seq).padStart(6, "0")}`;
  }

  // -----------------------------
  // CREATE BROADCAST
  // -----------------------------
  private async createBroadcast(
    dto: CreateBroadcastDto,
    buyerId: string,
    location: { type: string; coordinates: [number, number] },
  ) {
    const results = await this.userService.findUserById(buyerId);
    if (!results) {
      throw new NotFoundException(
        this.i18n.translate("auth.broadcast.user_not_found", { lang: this.lang }),
      );
    }

    const broadcastCode = await this.generateNextBroadcastCode();
    const { latitude, longitude } = toLatLng(location);

    return this.prisma.broadcast.create({
      data: {
        id: generateObjectId(),
        broadcastCode,
        buyerId,
        message: dto.message,
        address: dto.address ?? null,
        purpose: dto.purpose as BroadcastPurpose,
        radius: Math.round(Number(dto.radius)),
        categoryId: dto.categoryId,
        type: dto.type as BroadcastType,
        latitude,
        longitude,
      },
    });
  }

  // -----------------------------
  // FIND NEARBY SELLERS
  // -----------------------------
  private async findNearbySellers(
    location: { type: string; coordinates: [number, number] },
    radiusKm: number,
    categoryId: string,
  ) {
    const radiusMeters = radiusKm * 1000;
    return this.productsService.findNearbyProductShopOwnerIds(
      categoryId,
      location.coordinates,
      radiusMeters,
    );
  }

  // -----------------------------
  // FIND NEARBY SERVICE PROVIDERS
  // -----------------------------
  private async findNearbyServiceProviders(
    location: { type: string; coordinates: [number, number] },
    radiusKm: number,
    categoryId: string,
  ): Promise<string[]> {
    const radiusMeters = radiusKm * 1000;
    return this.servicesService.findNearbyServiceOwnerIds(
      categoryId,
      location.coordinates,
      radiusMeters,
    );
  }

  // -----------------------------
  // CATEGORY CHECK
  // -----------------------------
  private async findCategorybyId(categoryId: string) {
    return this.categoryService.findById(categoryId);
  }

  // -----------------------------
  // CREATE THREADS (NEW CORE LOGIC)
  // -----------------------------
  private async createBroadcastThreads(
    broadcastId: string,
    sellerIds: string[],
    buyerId: string,
  ) {
    // Was N findOneAndUpdate(upsert) round trips; the @@unique index on
    // (broadcastId, sellerId) makes createMany + skipDuplicates one statement
    // with the same effect.
    await this.prisma.broadcastThread.createMany({
      data: sellerIds.map((sellerId) => ({
        id: generateObjectId(),
        broadcastId,
        buyerId,
        sellerId,
      })),
      skipDuplicates: true,
    });

    return this.prisma.broadcastThread.findMany({ where: { broadcastId } });
  }

  // -----------------------------
  // MAIN: CREATE + DISPATCH
  // -----------------------------
  async createBroadcastAndDispatch(
    dto: CreateBroadcastDto,
    buyerId: string,
    location: { type: string; coordinates: [number, number] },
    imageUrls?: string[],
  ) {
    const isCategoryValid = await this.findCategorybyId(dto.categoryId);

    if (!isCategoryValid) {
      throw new BadRequestException(
        this.i18n.translate("auth.broadcast.category_invalid", { lang: this.lang }),
      );
    }

    if (dto.type !== "product" && dto.type !== "service") {
      throw new BadRequestException(
        this.i18n.translate("auth.broadcast.type_invalid", { lang: this.lang }),
      );
    }

    let sellerIds: string[] = [];

    // Determine recipient IDs based on broadcast type
    if (dto.type === "product") {
      sellerIds = await this.findNearbySellers(location, dto.radius, dto.categoryId);
    } else if (dto.type === "service") {
      sellerIds = await this.findNearbyServiceProviders(
        location,
        dto.radius,
        dto.categoryId,
      );
    }

    sellerIds = [...new Set(sellerIds.map((id) => String(id)))];
    sellerIds = sellerIds.filter((id) => id !== String(buyerId));

    if (!sellerIds.length) {
      throw new BadRequestException(
        this.i18n.translate(
          dto.purpose === "Buying"
            ? "auth.broadcast.no_sellers_found"
            : "auth.broadcast.no_buyers_found",
          { lang: this.lang },
        ),
      );
    }

    const broadcast = await this.createBroadcast(dto, buyerId, location);

    // 1. CREATE THREADS
    const threads = await this.createBroadcastThreads(
      broadcast.id,
      sellerIds,
      buyerId,
    );

    const threadBySellerId = new Map<string, string>(
      threads.map((thread) => [thread.sellerId, thread.id]),
    );

    // 2. CREATE INITIAL MESSAGES
    //
    // NOTE: these used to be written with `type: "SYSTEM"`, a field
    // BroadcastMessage has never declared — Mongoose silently dropped it, and
    // the two queries that later filtered on it therefore matched nothing (see
    // getBroadcastDetailForAdmin). The initial message is now identified as the
    // earliest message of the broadcast, which is what those queries meant.
    await this.prisma.broadcastMessage.createMany({
      data: threads.map((thread) => ({
        id: generateObjectId(),
        broadcastId: broadcast.id,
        threadId: thread.id,
        senderId: buyerId,
        receiverId: thread.sellerId,
        message: dto.message || DEFAULT_BROADCAST_MESSAGE,
        imageUrls: imageUrls ?? [],
        isRead: false,
      })),
    });

    // 3. GET BUYER AND CATEGORY INFO FOR NOTIFICATIONS
    const buyer = await this.userService.findUserById(buyerId);

    if (buyer?.email) {
      this.sendBroadcastCreatedEmail(
        buyer.name ?? "",
        buyer.email,
        broadcast.broadcastCode,
      );
    }

    // 4. SEND NOTIFICATIONS TO ALL SELLERS
    const notificationPromises = sellerIds.map((sellerId) =>
      this.notificationsService.createAndNotify(
        sellerId,
        "broadcast_created",
        "PROMOTION",
        {
          broadcastId: broadcast.id,
          threadId: threadBySellerId.get(sellerId) ?? null,
          buyerId,
          message: dto.message || DEFAULT_BROADCAST_MESSAGE,
          purpose: dto.purpose,
          broadcastType: dto.type,
          category: dto.categoryId,
          radius: dto.radius,
          address: dto.address,
          imageUrls: imageUrls || [],
        },
        {
          broadcastType: dto.type === "product" ? "Product" : "Service",
          buyerName: buyer?.name,
          categoryName:
            (isCategoryValid?.name as any)?.[this.lang] || "Unknown Category",
          purpose: dto.purpose,
        },
      ),
    );

    const notificationResults = await Promise.allSettled(notificationPromises);
    notificationResults.forEach((result, index) => {
      if (result.status === "rejected") {
        this.logger.error(
          `Failed to notify seller ${sellerIds[index]} about broadcast ${broadcast.id}`,
          result.reason,
        );
      }
    });

    return {
      message: this.i18n.translate("auth.broadcast.created_success", {
        lang: this.lang,
      }),
      data: { id: broadcast.id },
    };
  }

  // -----------------------------
  // SEND MESSAGE (THREAD SAFE)
  // -----------------------------
  async sendBroadcastMessage(
    broadcastId: string,
    senderId: string,
    receiverId: string,
    threadId: string,
    message: string,
    imageUrl?: string,
    options?: { audioUrl?: string; audioDuration?: number },
  ) {
    // 1. Validate broadcast
    const broadcast = await this.prisma.broadcast.findUnique({
      where: { id: broadcastId },
    });
    if (!broadcast) {
      throw new NotFoundException(
        this.i18n.translate("auth.broadcast.broadcast_not_found", { lang: this.lang }),
      );
    }

    // 2. Validate users
    const [sender, receiver] = await Promise.all([
      this.userService.findUserById(senderId),
      this.userService.findUserById(receiverId),
    ]);

    if (!sender || !receiver) {
      throw new NotFoundException(
        this.i18n.translate("auth.products.user_not_found", { lang: this.lang }),
      );
    }

    // 3. Validate thread (SOURCE OF TRUTH)
    const thread = await this.prisma.broadcastThread.findUnique({
      where: { id: threadId },
    });

    if (!thread) {
      throw new NotFoundException(
        this.i18n.translate("auth.broadcast.thread_not_found", { lang: this.lang }),
      );
    }

    // 4. Ensure thread belongs to broadcast
    if (thread.broadcastId !== broadcastId) {
      throw new BadRequestException(
        this.i18n.translate("auth.broadcast.thread_invalid", { lang: this.lang }),
      );
    }

    // 5. Validate sender is participant
    const isParticipant = thread.buyerId === senderId || thread.sellerId === senderId;

    if (!isParticipant) {
      throw new BadRequestException(
        this.i18n.translate("auth.broadcast.sender_not_in_thread", { lang: this.lang }),
      );
    }

    // 6. Validate receiver is participant
    const isValidReceiver =
      thread.buyerId === receiverId || thread.sellerId === receiverId;

    if (!isValidReceiver) {
      throw new BadRequestException(
        this.i18n.translate("auth.broadcast.receiver_invalid", { lang: this.lang }),
      );
    }

    // 6.5. Gate: real chat requires an accepted offer on this thread — recipients must make a
    // formal offer first, and neither side can free-chat until the creator accepts it.
    const acceptedOffer = await this.prisma.broadcastOffer.findFirst({
      where: { threadId: thread.id, status: "accepted" },
      select: { id: true },
    });
    if (!acceptedOffer) {
      throw new ForbiddenException(
        this.i18n.translate("auth.broadcast.offer_not_accepted", { lang: this.lang }),
      );
    }

    // 7. Derive the true thread recipient
    const computedReceiverId =
      senderId === thread.buyerId ? thread.sellerId : thread.buyerId;

    if (computedReceiverId === senderId) {
      throw new BadRequestException(
        this.i18n.translate("auth.broadcast.receiver_invalid", { lang: this.lang }),
      );
    }

    const actualReceiverId = computedReceiverId;
    if (receiverId !== computedReceiverId) {
      this.logger.warn(
        `sendBroadcastMessage: overriding provided receiverId=${receiverId} with computedReceiverId=${computedReceiverId}`,
      );
    }

    // 8. Create message
    const messageResults = await this.prisma.broadcastMessage.create({
      data: {
        id: generateObjectId(),
        broadcastId,
        threadId,
        senderId,
        receiverId: actualReceiverId,
        message,
        imageUrls: imageUrl ? [imageUrl] : [],
        audioUrl: options?.audioUrl ?? null,
        audioDuration: options?.audioDuration ?? null,
        isRead: false,
      },
    });

    // 9. Notify via push notification service
    try {
      await this.notificationsService.createAndNotify(
        actualReceiverId,
        "broadcast.new_message",
        "BROADCAST",
        {
          thread: {
            id: thread.id,
            buyer: thread.buyerId,
            seller: thread.sellerId,
            broadcast: thread.broadcastId,
          },
          broadcastSubTab: actualReceiverId === thread.buyerId ? "sent" : "received",
          message: {
            id: messageResults.id,
            text: messageResults.message,
            imageUrls: messageResults.imageUrls,
          },
          sender: {
            id: sender.id,
            name: sender.name,
            image: sender.image,
          },
        },
        { senderName: sender.name },
        sender.name,
      );
    } catch (err) {
      this.logger.error("Failed to send broadcast notification", err);
    }

    // 10. REALTIME EMIT (single source of truth)
    const payload = {
      message: this.withLegacyId(messageResults),
      sender,
      thread: {
        id: threadId,
        buyer: thread.buyerId,
        seller: thread.sellerId,
        broadcast: thread.broadcastId,
      },
    };

    this.broadcastGateway.emitToThreadAndUser(threadId, actualReceiverId, payload);

    return { data: payload };
  }

  async markThreadMessagesAsRead(threadId: string, userId: string) {
    await this.prisma.broadcastMessage.updateMany({
      where: { threadId, receiverId: userId, isRead: false },
      data: { isRead: true },
    });

    return { success: true };
  }

  // -----------------------------
  // GET THREADS
  // -----------------------------
  async getBroadcastThreads(broadcastId: string, currentUserId?: string) {
    // Was one aggregation with five $lookups (buyer, seller, offer, a sorted
    // sub-pipeline for the newest message, and a counting sub-pipeline for
    // unread). Now: one relation query plus two grouped lookups — still three
    // round trips total, and no per-thread sub-pipeline.
    const threads = await this.prisma.broadcastThread.findMany({
      where: { broadcastId },
      include: {
        buyer: { select: { id: true, name: true, image: true } },
        seller: { select: { id: true, name: true, image: true } },
        offer: true,
      },
    });

    if (threads.length === 0) return [];

    const threadIds = threads.map((t) => t.id);
    const [latestMessages, unreadCounts] = await Promise.all([
      this.broadcastRepository.latestMessagePerThread(threadIds),
      currentUserId
        ? this.broadcastRepository.unreadCountPerThread(threadIds, currentUserId)
        : Promise.resolve(new Map<string, number>()),
    ]);

    const rows = threads.map((t) => {
      const { buyer, seller, offer, ...rest } = t;
      const latestMessage = latestMessages.get(t.id) ?? null;
      return {
        ...rest,
        _id: t.id,
        broadcast: t.broadcastId,
        buyer: buyer ? { ...buyer, _id: buyer.id } : null,
        seller: seller ? { ...seller, _id: seller.id } : null,
        offer: offer ? this.withLegacyId(offer) : null,
        latestMessage,
        unreadCount: unreadCounts.get(t.id) ?? 0,
      };
    });

    // Same ordering as the old $sort: newest activity first, falling back to
    // the thread's own creation time when it has no messages yet.
    return rows.sort((a, b) => {
      const aAt = a.latestMessage?.createdAt ?? a.createdAt;
      const bAt = b.latestMessage?.createdAt ?? b.createdAt;
      return bAt.getTime() - aAt.getTime();
    });
  }

  // -----------------------------
  // GET THREAD MESSAGES
  // -----------------------------
  async getThreadMessages(threadId: string, userId?: string) {
    const messages = await this.prisma.broadcastMessage.findMany({
      where: { threadId },
      include: {
        sender: { select: { id: true, name: true } },
        receiver: { select: { id: true, name: true } },
      },
      orderBy: { createdAt: "asc" },
    });

    if (userId) {
      await this.markThreadMessagesAsRead(threadId, userId);
    }

    return messages.map((m) => this.withLegacyId(m));
  }

  // -----------------------------
  // GET BROADCASTS CREATED BY BUYER
  // -----------------------------
  async getBroadcastsByBuyer(userId: string, page = 1, limit = 10) {
    const pageNum = Number(page);
    const limitNum = Number(limit);

    if (isNaN(pageNum) || isNaN(limitNum) || pageNum < 1 || limitNum < 1) {
      throw new BadRequestException(
        this.i18n.translate("common.invalid_pagination", { lang: this.lang }),
      );
    }

    const skip = (pageNum - 1) * limitNum;
    const where: Prisma.BroadcastWhereInput = { buyerId: userId };

    const [broadcasts, total] = await Promise.all([
      this.prisma.broadcast.findMany({
        where,
        include: {
          category: true,
          _count: { select: { threads: true } },
        },
        orderBy: { createdAt: "desc" },
        skip,
        take: limitNum,
      }),
      this.prisma.broadcast.count({ where }),
    ]);

    if (broadcasts.length === 0) {
      return {
        meta: { total, page: pageNum, limit: limitNum, totalPages: Math.ceil(total / limitNum) },
        data: [],
      };
    }

    const broadcastIds = broadcasts.map((b) => b.id);

    // Unread messages addressed to the buyer, and the newest message, per broadcast.
    const [unreadGroups, latestMessages] = await Promise.all([
      this.prisma.broadcastMessage.groupBy({
        by: ["broadcastId"],
        where: {
          broadcastId: { in: broadcastIds },
          receiverId: userId,
          isRead: false,
          senderId: { not: userId },
        },
        _count: { _all: true },
      }),
      this.prisma.$queryRaw<
        {
          broadcast_id: string;
          id: string;
          message: string | null;
          image_urls: string[];
          created_at: Date;
          sender_id: string | null;
          sender_name: string | null;
          sender_image: string | null;
        }[]
      >`
        SELECT DISTINCT ON (m.broadcast_id)
               m.broadcast_id, m.id, m.message, m.image_urls, m.created_at,
               u.id AS sender_id, u.name AS sender_name, u.image AS sender_image
        FROM broadcast_messages m
        LEFT JOIN users u ON u.id = m.sender_id
        WHERE m.broadcast_id = ANY(${broadcastIds})
        ORDER BY m.broadcast_id, m.created_at DESC
      `,
    ]);

    const unreadByBroadcast = new Map(
      unreadGroups.map((g) => [g.broadcastId, g._count._all]),
    );
    const latestByBroadcast = new Map(
      latestMessages.map((m) => [
        m.broadcast_id,
        {
          _id: m.id,
          id: m.id,
          message: m.message,
          imageUrls: m.image_urls ?? [],
          createdAt: m.created_at,
          sender: m.sender_id
            ? {
                _id: m.sender_id,
                id: m.sender_id,
                name: m.sender_name,
                image: m.sender_image,
              }
            : null,
        },
      ]),
    );

    const data = broadcasts.map((b) => {
      const { _count, ...rest } = b;
      const latestMessage = latestByBroadcast.get(b.id) ?? null;
      return {
        ...this.toApiShape(rest),
        threadCount: _count.threads,
        unreadCount: unreadByBroadcast.get(b.id) ?? 0,
        latestMessage,
        imageUrls: latestMessage?.imageUrls ?? [],
      };
    });

    return {
      meta: {
        total,
        page: pageNum,
        limit: limitNum,
        totalPages: Math.ceil(total / limitNum),
      },
      data,
    };
  }

  // -----------------------------
  // GET BROADCASTS WHERE USER IS SELLER
  // -----------------------------
  async getBroadcastsForSeller(
    userId: string,
    rawPage: number | string = 1,
    rawLimit: number | string = 10,
  ): Promise<PaginatedResponseDto<any>> {
    const { page, limit, skip } = resolvePagination(rawPage, rawLimit);
    const where: Prisma.BroadcastThreadWhereInput = { sellerId: userId };

    const [threads, total] = await Promise.all([
      this.prisma.broadcastThread.findMany({
        where,
        orderBy: { createdAt: "desc" },
        skip,
        take: limit,
        select: { id: true, broadcastId: true },
      }),
      this.prisma.broadcastThread.count({ where }),
    ]);

    if (threads.length === 0) {
      return {
        meta: { total, page, limit, totalPages: Math.ceil(total / limit) },
        data: [],
      };
    }

    const threadIds = threads.map((t) => t.id);
    const threadByBroadcastId = new Map(threads.map((t) => [t.broadcastId, t.id]));

    const [unreadCounts, myOffers, broadcasts] = await Promise.all([
      this.broadcastRepository.unreadCountPerThread(threadIds, userId),
      this.prisma.broadcastOffer.findMany({
        where: { threadId: { in: threadIds }, offererId: userId },
      }),
      this.prisma.broadcast.findMany({
        where: { id: { in: [...new Set(threads.map((t) => t.broadcastId))] } },
        include: { category: true },
      }),
    ]);

    const offerByThreadId = new Map(myOffers.map((o) => [o.threadId, o]));
    const broadcastsById = new Map(broadcasts.map((b) => [b.id, b]));

    // Maintain thread order and add threadId
    const orderedData = threads
      .map((t) => broadcastsById.get(t.broadcastId))
      .filter((b): b is NonNullable<typeof b> => b != null)
      .map((broadcast) => {
        const threadId = threadByBroadcastId.get(broadcast.id);
        const offer = threadId ? offerByThreadId.get(threadId) : undefined;
        return {
          ...this.toApiShape(broadcast),
          threadId,
          unreadCount: threadId ? (unreadCounts.get(threadId) ?? 0) : 0,
          offer: offer ? this.withLegacyId(offer) : null,
        };
      });

    return {
      meta: { total, page, limit, totalPages: Math.ceil(total / limit) },
      data: orderedData,
    };
  }

  async getAllBroadcastsForAdmin(
    page = 1,
    limit = 10,
    search?: string,
    status?: string,
    startDate?: string,
    endDate?: string,
  ): Promise<PaginatedResponseDto<any>> {
    const pageNum = Number(page) || 1;
    const limitNum = Number(limit) || 10;
    const skip = (pageNum - 1) * limitNum;

    const { rows, total } = await this.broadcastRepository.findForAdmin({
      skip,
      take: limitNum,
      search,
      status,
      startDate,
      endDate,
    });

    return {
      data: rows,
      meta: {
        total,
        page: pageNum,
        limit: limitNum,
        totalPages: Math.ceil(total / limitNum),
      },
    };
  }

  async getBroadcastDetailForAdmin(broadcastId: string) {
    if (!isObjectIdLike(broadcastId)) {
      throw new BadRequestException("Invalid broadcast id");
    }

    const broadcast = await this.prisma.broadcast.findFirst({
      where: { id: broadcastId, isDeleted: false },
      include: {
        buyer: { select: { id: true, name: true, email: true, phone: true, image: true } },
        category: true,
      },
    });

    if (!broadcast) {
      throw new NotFoundException("Broadcast not found");
    }

    const [threadCount, repliedSellers, initialMessage] = await Promise.all([
      this.prisma.broadcastThread.count({ where: { broadcastId } }),
      this.prisma.broadcastMessage.findMany({
        where: { broadcastId, senderId: { not: broadcast.buyerId } },
        distinct: ["senderId"],
        select: { senderId: true },
      }),
      // Was findOne({ type: "SYSTEM" }) — a field BroadcastMessage never
      // declared, so this always came back null and `imageUrls` was always [].
      // The initial message is the earliest one on the broadcast.
      this.prisma.broadcastMessage.findFirst({
        where: { broadcastId },
        orderBy: { createdAt: "asc" },
        select: { imageUrls: true },
      }),
    ]);

    return {
      data: {
        ...this.toApiShape(broadcast),
        sentTo: threadCount,
        repliedSellers: repliedSellers.length,
        imageUrls: initialMessage?.imageUrls ?? [],
      },
    };
  }

  /**
   * Every offer placed on one broadcast, for the admin Broadcasts screen.
   *
   * Unlike getOffersForBroadcast, which is the broadcaster's own view and is
   * scoped to their user id, this is not scoped to anyone — the caller is an
   * admin holding the "broadcasts" permission.
   */
  async getBroadcastOffersForAdmin(broadcastId: string) {
    if (!isObjectIdLike(broadcastId)) {
      throw new BadRequestException("Invalid broadcast id");
    }

    const broadcast = await this.prisma.broadcast.findFirst({
      where: { id: broadcastId, isDeleted: false },
      select: { id: true, broadcastCode: true, message: true },
    });
    if (!broadcast) {
      throw new NotFoundException("Broadcast not found");
    }

    const offers = await this.prisma.broadcastOffer.findMany({
      where: { broadcastId },
      include: {
        offerer: { select: { id: true, name: true, email: true, image: true, phone: true } },
      },
      orderBy: { createdAt: "desc" },
    });

    const data = offers.map((o) => ({
      _id: o.id,
      id: o.id,
      price: o.price,
      message: o.message,
      status: o.status,
      createdAt: o.createdAt,
      respondedAt: o.respondedAt,
      threadId: o.threadId,
      offerer: o.offerer
        ? { _id: o.offerer.id, ...o.offerer }
        : { _id: o.offererId, id: o.offererId, name: null, email: null, image: null, phone: null },
    }));

    // The screen shows "N users offered" alongside the list, and a seller can
    // only hold one offer per thread, so a count of rows is a count of people.
    const byStatus = data.reduce<Record<string, number>>((acc, o) => {
      acc[o.status] = (acc[o.status] ?? 0) + 1;
      return acc;
    }, {});

    return {
      data,
      meta: {
        total: data.length,
        broadcast: {
          _id: broadcast.id,
          id: broadcast.id,
          broadcastCode: broadcast.broadcastCode,
          message: broadcast.message,
        },
        pending: byStatus.pending ?? 0,
        accepted: byStatus.accepted ?? 0,
        declined: byStatus.declined ?? 0,
      },
    };
  }

  async getBroadcastRecipients(broadcastId: string) {
    if (!isObjectIdLike(broadcastId)) {
      throw new BadRequestException("Invalid broadcast id");
    }

    const broadcastExists = await this.prisma.broadcast.findFirst({
      where: { id: broadcastId, isDeleted: false },
      select: { id: true },
    });
    if (!broadcastExists) {
      throw new NotFoundException("Broadcast not found");
    }

    const threads = await this.prisma.broadcastThread.findMany({
      where: { broadcastId },
      include: {
        seller: { select: { id: true, name: true, email: true, image: true, phone: true } },
      },
      orderBy: { createdAt: "desc" },
    });

    const firstReplies = await this.broadcastRepository.firstSellerReplyPerThread(
      threads.map((t) => t.id),
    );

    const recipients = threads.map((t) => {
      const repliedAt = firstReplies.get(t.id) ?? null;
      return {
        sellerId: t.seller?.id ?? t.sellerId,
        name: t.seller?.name ?? null,
        email: t.seller?.email ?? null,
        image: t.seller?.image ?? null,
        phone: t.seller?.phone ?? null,
        sentAt: t.createdAt,
        hasReplied: repliedAt !== null,
        repliedAt,
      };
    });

    return {
      data: recipients,
      meta: { total: recipients.length },
    };
  }

  /** Admin: paginated messages in the thread for one recipient (seller) of a broadcast. */
  async getAdminThreadMessages(
    broadcastId: string,
    sellerId: string,
    paginationDto: PaginationDto,
  ) {
    if (!isObjectIdLike(broadcastId) || !isObjectIdLike(sellerId)) {
      throw new BadRequestException("Invalid broadcast or seller id");
    }

    const { page: rawPage, limit: rawLimit } = paginationDto;
    const { page, limit, skip } = resolvePagination(rawPage, rawLimit);

    const thread = await this.prisma.broadcastThread.findUnique({
      where: { broadcastId_sellerId: { broadcastId, sellerId } },
    });

    if (!thread) {
      return {
        thread: null,
        messages: [],
        meta: { total: 0, page, limit, totalPages: 0 },
      };
    }

    const [data, total] = await Promise.all([
      this.prisma.broadcastMessage.findMany({
        where: { threadId: thread.id },
        orderBy: { createdAt: "desc" },
        skip,
        take: limit,
      }),
      this.prisma.broadcastMessage.count({ where: { threadId: thread.id } }),
    ]);

    return {
      thread: { _id: thread.id, id: thread.id },
      messages: data.map((m) => this.withLegacyId(m)),
      meta: { total, page, limit, totalPages: Math.ceil(total / limit) },
    };
  }

  async closeBroadcast(broadcastId: string) {
    return this.setBroadcastFlag(broadcastId, { status: "closed" }, "Broadcast closed successfully");
  }

  async deleteBroadcast(broadcastId: string) {
    return this.setBroadcastFlag(
      broadcastId,
      { isDeleted: true },
      "Broadcast deleted successfully",
    );
  }

  /** close/delete differed only in the field written and the message. */
  private async setBroadcastFlag(
    broadcastId: string,
    data: Prisma.BroadcastUpdateInput,
    message: string,
  ) {
    if (!isObjectIdLike(broadcastId)) {
      throw new BadRequestException("Invalid broadcast id");
    }
    const existing = await this.prisma.broadcast.findUnique({
      where: { id: broadcastId },
      select: { id: true },
    });
    if (!existing) {
      throw new NotFoundException("Broadcast not found");
    }
    const broadcast = await this.prisma.broadcast.update({
      where: { id: broadcastId },
      data,
    });
    return { message, data: this.toApiShape(broadcast) };
  }
}
