import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  Logger,
  NotFoundException,
} from "@nestjs/common";
import { I18nService } from "nestjs-i18n";
import { ClsService } from "nestjs-cls";

import { NotificationsService } from "src/notifications/notifications.service";
import { BroadcastGateway } from "./broadcast.gateway";
import { CreateBroadcastOfferDto } from "./dto/create-broadcast-offer.dto";
import { PrismaService } from "src/prisma/prisma.service";
import { generateObjectId, isObjectIdLike } from "src/common/utils/object-id.util";

@Injectable()
export class BroadcastOfferService {
  private readonly logger = new Logger(BroadcastOfferService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly notificationsService: NotificationsService,
    private readonly broadcastGateway: BroadcastGateway,
    private readonly i18n: I18nService,
    private readonly cls: ClsService,
  ) {}

  private get lang(): string {
    return this.cls.get("lang") || "en";
  }

  /** Clients read `_id`; Prisma rows carry `id`. */
  private withLegacyId<T extends { id: string }>(row: T): T & { _id: string } {
    return { ...row, _id: row.id };
  }

  /** Recipients only ever reach a thread they were actually dispatched to — the thread is
   *  derived server-side from {broadcast, seller}, never trusted from the client. */
  private async requireOwnThread(broadcastId: string, offererId: string) {
    if (!isObjectIdLike(broadcastId)) {
      throw new NotFoundException(
        this.i18n.translate("auth.broadcast.broadcast_not_found", { lang: this.lang }),
      );
    }
    const thread = await this.prisma.broadcastThread.findUnique({
      where: { broadcastId_sellerId: { broadcastId, sellerId: offererId } },
    });
    if (!thread) {
      throw new NotFoundException(
        this.i18n.translate("auth.broadcast.thread_not_found", { lang: this.lang }),
      );
    }
    return thread;
  }

  async submitOffer(offererId: string, dto: CreateBroadcastOfferDto) {
    const thread = await this.requireOwnThread(dto.broadcastId, offererId);

    // One offer per thread — enforced by a unique index on thread_id as well.
    const existing = await this.prisma.broadcastOffer.findUnique({
      where: { threadId: thread.id },
      select: { id: true },
    });
    if (existing) {
      throw new BadRequestException(
        this.i18n.translate("auth.broadcast.offer_already_submitted", { lang: this.lang }),
      );
    }

    // Price is optional — an offer can be just a message. If given, it must
    // still be a positive number.
    if (dto.price != null && (!Number.isFinite(dto.price) || dto.price <= 0)) {
      throw new BadRequestException(
        this.i18n.translate("auth.broadcast.offer_price_invalid", { lang: this.lang }),
      );
    }
    const message = dto.message?.trim();
    if (!message) {
      throw new BadRequestException(
        this.i18n.translate("auth.broadcast.offer_message_required", { lang: this.lang }),
      );
    }

    const offer = await this.prisma.broadcastOffer.create({
      data: {
        id: generateObjectId(),
        broadcastId: thread.broadcastId,
        threadId: thread.id,
        offererId,
        creatorId: thread.buyerId,
        price: dto.price != null ? Math.round(dto.price) : null,
        message: message.slice(0, 1000),
        status: "pending",
      },
    });

    const payloadOffer = this.withLegacyId(offer);

    this.notificationsService
      .createAndNotify(
        thread.buyerId,
        "broadcast.offer_submitted",
        "BROADCAST",
        {
          // buyer/seller included so the client can deep-link straight into
          // this thread (ThreadChatScreen requires all three ids) instead of
          // falling back to the generic broadcasts list.
          thread: {
            id: thread.id,
            buyer: thread.buyerId,
            seller: thread.sellerId,
            broadcast: thread.broadcastId,
          },
          offer: payloadOffer,
        },
        {},
      )
      .catch((err) =>
        this.logger.error("Failed to send offer-submitted notification", err),
      );

    this.broadcastGateway.emitToThreadAndUser(thread.id, thread.buyerId, {
      type: "offer_submitted",
      offer: payloadOffer,
      thread: {
        id: thread.id,
        buyer: thread.buyerId,
        seller: thread.sellerId,
        broadcast: thread.broadcastId,
      },
    });

    return { data: { offer: payloadOffer } };
  }

  /** Broadcasts the current user created, that have at least one offer — grouped with a count. */
  async getMyBroadcastsWithOffers(creatorId: string, page = 1, limit = 10) {
    const pageNum = Number(page) || 1;
    const limitNum = Number(limit) || 10;
    const skip = (pageNum - 1) * limitNum;

    // Was a $group + $lookup(broadcasts) + $project pipeline, run twice (the
    // second time only to $count).
    const [groups, distinctCount] = await Promise.all([
      this.prisma.broadcastOffer.groupBy({
        by: ["broadcastId"],
        where: { creatorId },
        _count: { _all: true },
        _max: { createdAt: true },
        orderBy: { _max: { createdAt: "desc" } },
        skip,
        take: limitNum,
      }),
      this.prisma.$queryRaw<{ count: bigint }[]>`
        SELECT count(DISTINCT broadcast_id) AS count
        FROM broadcast_offers
        WHERE creator_id = ${creatorId}
      `,
    ]);

    const broadcasts = await this.prisma.broadcast.findMany({
      where: { id: { in: groups.map((g) => g.broadcastId) } },
    });
    const broadcastsById = new Map(broadcasts.map((b) => [b.id, b]));

    const rows = groups.map((g) => ({
      broadcastId: g.broadcastId,
      offerCount: g._count._all,
      latestOfferAt: g._max.createdAt,
      broadcast: broadcastsById.get(g.broadcastId)
        ? this.withLegacyId(broadcastsById.get(g.broadcastId)!)
        : null,
    }));

    const total = Number(distinctCount[0]?.count ?? 0);
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

  /** Offers the current user has submitted (as a broadcast recipient), flat and newest-first. */
  async getMySentOffers(offererId: string, page = 1, limit = 10) {
    const pageNum = Number(page) || 1;
    const limitNum = Number(limit) || 10;
    const skip = (pageNum - 1) * limitNum;

    const [offers, total] = await Promise.all([
      this.prisma.broadcastOffer.findMany({
        where: { offererId },
        include: {
          broadcast: {
            select: {
              id: true,
              message: true,
              type: true,
              buyer: { select: { id: true, name: true, image: true } },
            },
          },
        },
        orderBy: { createdAt: "desc" },
        skip,
        take: limitNum,
      }),
      this.prisma.broadcastOffer.count({ where: { offererId } }),
    ]);

    return {
      data: offers.map(({ broadcast, ...o }) => ({
        ...this.withLegacyId(o),
        // Buyer name/image so the native/web "sent offers" list can open the
        // thread with a proper header instead of falling back to a generic
        // title once an offer has been accepted.
        broadcast: broadcast ? { ...broadcast, _id: broadcast.id } : null,
      })),
      meta: {
        total,
        page: pageNum,
        limit: limitNum,
        totalPages: Math.ceil(total / limitNum),
      },
    };
  }

  /** All offers on one broadcast — only the broadcast's own creator may view them. */
  async getOffersForBroadcast(broadcastId: string, requesterId: string) {
    if (!isObjectIdLike(broadcastId)) {
      throw new NotFoundException(
        this.i18n.translate("auth.broadcast.broadcast_not_found", { lang: this.lang }),
      );
    }
    const broadcast = await this.prisma.broadcast.findUnique({
      where: { id: broadcastId },
    });
    if (!broadcast) {
      throw new NotFoundException(
        this.i18n.translate("auth.broadcast.broadcast_not_found", { lang: this.lang }),
      );
    }
    if (broadcast.buyerId !== requesterId) {
      throw new ForbiddenException(
        this.i18n.translate("auth.broadcast.not_broadcast_owner", { lang: this.lang }),
      );
    }

    const offers = await this.prisma.broadcastOffer.findMany({
      where: { broadcastId: broadcast.id },
      include: { offerer: { select: { id: true, name: true, image: true } } },
      orderBy: { createdAt: "desc" },
    });

    return {
      data: {
        broadcast: this.withLegacyId(broadcast),
        offers: offers.map(({ offerer, ...o }) => ({
          ...this.withLegacyId(o),
          offerer: offerer ? { ...offerer, _id: offerer.id } : null,
        })),
      },
    };
  }

  async respondToOffer(
    offerId: string,
    requesterId: string,
    action: "accept" | "decline",
  ) {
    if (!isObjectIdLike(offerId)) {
      throw new NotFoundException(
        this.i18n.translate("auth.broadcast.offer_not_found", { lang: this.lang }),
      );
    }
    const existing = await this.prisma.broadcastOffer.findUnique({
      where: { id: offerId },
    });
    if (!existing) {
      throw new NotFoundException(
        this.i18n.translate("auth.broadcast.offer_not_found", { lang: this.lang }),
      );
    }
    if (existing.creatorId !== requesterId) {
      throw new ForbiddenException(
        this.i18n.translate("auth.broadcast.not_broadcast_owner", { lang: this.lang }),
      );
    }
    if (existing.status !== "pending") {
      throw new BadRequestException(
        this.i18n.translate("auth.broadcast.offer_already_responded", { lang: this.lang }),
      );
    }

    const offer = await this.prisma.broadcastOffer.update({
      where: { id: offerId },
      data: {
        status: action === "accept" ? "accepted" : "declined",
        respondedAt: new Date(),
      },
    });

    const payloadOffer = this.withLegacyId(offer);

    this.notificationsService
      .createAndNotify(
        offer.offererId,
        action === "accept" ? "broadcast.offer_accepted" : "broadcast.offer_declined",
        "BROADCAST",
        {
          // buyer/seller included so the client can deep-link straight into
          // this thread instead of falling back to the generic broadcasts
          // list — same fix as the offer-submitted notification above.
          thread: {
            id: offer.threadId,
            buyer: offer.creatorId,
            seller: offer.offererId,
            broadcast: offer.broadcastId,
          },
          offer: payloadOffer,
        },
        {},
      )
      .catch((err) =>
        this.logger.error("Failed to send offer-response notification", err),
      );

    this.broadcastGateway.emitToThreadAndUser(offer.threadId, offer.offererId, {
      type: "offer_status",
      offer: payloadOffer,
    });

    return {
      data: {
        offer: payloadOffer,
        threadId: offer.threadId,
        broadcastId: offer.broadcastId,
      },
    };
  }
}
