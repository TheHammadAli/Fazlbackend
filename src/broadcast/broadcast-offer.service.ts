import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from "@nestjs/common";
import { InjectModel } from "@nestjs/mongoose";
import { Model, Types } from "mongoose";
import { I18nService } from "nestjs-i18n";
import { ClsService } from "nestjs-cls";

import { Broadcast } from "./schema/broadcast.schema";
import { BroadcastThread } from "./schema/broadcast-thread.schema";
import { BroadcastOffer } from "./schema/broadcast-offer.schema";
import { NotificationsService } from "src/notifications/notifications.service";
import { BroadcastGateway } from "./broadcast.gateway";
import { CreateBroadcastOfferDto } from "./dto/create-broadcast-offer.dto";

@Injectable()
export class BroadcastOfferService {
  constructor(
    @InjectModel(Broadcast.name)
    private readonly broadcastModel: Model<Broadcast>,
    @InjectModel(BroadcastThread.name)
    private readonly threadModel: Model<BroadcastThread>,
    @InjectModel(BroadcastOffer.name)
    private readonly offerModel: Model<BroadcastOffer>,
    private readonly notificationsService: NotificationsService,
    private readonly broadcastGateway: BroadcastGateway,
    private readonly i18n: I18nService,
    private readonly cls: ClsService,
  ) {}

  private get lang(): string {
    return this.cls.get("lang") || "en";
  }

  /** Recipients only ever reach a thread they were actually dispatched to — the thread is
   *  derived server-side from {broadcast, seller}, never trusted from the client. */
  private async requireOwnThread(broadcastId: string, offererId: string) {
    if (!Types.ObjectId.isValid(broadcastId)) {
      throw new NotFoundException(
        this.i18n.translate("auth.broadcast.broadcast_not_found", { lang: this.lang }),
      );
    }
    const thread = await this.threadModel.findOne({
      broadcast: new Types.ObjectId(broadcastId),
      seller: new Types.ObjectId(offererId),
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

    const existing = await this.offerModel.findOne({ thread: thread._id });
    if (existing) {
      throw new BadRequestException(
        this.i18n.translate("auth.broadcast.offer_already_submitted", { lang: this.lang }),
      );
    }

    if (!Number.isFinite(dto.price) || dto.price <= 0) {
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

    const offer = await this.offerModel.create({
      broadcast: thread.broadcast,
      thread: thread._id,
      offerer: new Types.ObjectId(offererId),
      creator: thread.buyer,
      price: dto.price,
      message,
      status: "pending",
    });

    this.notificationsService
      .createAndNotify(
        thread.buyer.toString(),
        "broadcast.offer_submitted",
        "BROADCAST",
        { thread: { id: thread._id, broadcast: thread.broadcast }, offer },
        {},
      )
      .catch((err) => console.error("Failed to send offer-submitted notification:", err));

    this.broadcastGateway.emitToThreadAndUser(String(thread._id), thread.buyer.toString(), {
      type: "offer_submitted",
      offer,
      thread: { id: thread._id, buyer: thread.buyer, seller: thread.seller, broadcast: thread.broadcast },
    });

    return { data: { offer } };
  }

  /** Broadcasts the current user created, that have at least one offer — grouped with a count. */
  async getMyBroadcastsWithOffers(creatorId: string, page = 1, limit = 10) {
    const pageNum = Number(page) || 1;
    const limitNum = Number(limit) || 10;
    const skip = (pageNum - 1) * limitNum;
    const creatorObjectId = new Types.ObjectId(creatorId);

    const basePipeline: any[] = [
      { $match: { creator: creatorObjectId } },
      {
        $group: {
          _id: "$broadcast",
          offerCount: { $sum: 1 },
          latestOfferAt: { $max: "$createdAt" },
        },
      },
    ];

    const [rows, countResult] = await Promise.all([
      this.offerModel
        .aggregate([
          ...basePipeline,
          { $sort: { latestOfferAt: -1 } },
          { $skip: skip },
          { $limit: limitNum },
          {
            $lookup: {
              from: "broadcasts",
              localField: "_id",
              foreignField: "_id",
              as: "broadcast",
            },
          },
          { $unwind: { path: "$broadcast", preserveNullAndEmptyArrays: true } },
          {
            $project: {
              _id: 0,
              broadcastId: "$_id",
              offerCount: 1,
              latestOfferAt: 1,
              broadcast: 1,
            },
          },
        ])
        .exec(),
      this.offerModel.aggregate([...basePipeline, { $count: "total" }]).exec(),
    ]);

    const total = countResult[0]?.total ?? 0;
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
    const offererObjectId = new Types.ObjectId(offererId);

    const [offers, total] = await Promise.all([
      this.offerModel
        .find({ offerer: offererObjectId })
        .populate("broadcast", "message type")
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limitNum)
        .exec(),
      this.offerModel.countDocuments({ offerer: offererObjectId }),
    ]);

    return {
      data: offers,
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
    if (!Types.ObjectId.isValid(broadcastId)) {
      throw new NotFoundException(
        this.i18n.translate("auth.broadcast.broadcast_not_found", { lang: this.lang }),
      );
    }
    const broadcast = await this.broadcastModel.findById(broadcastId);
    if (!broadcast) {
      throw new NotFoundException(
        this.i18n.translate("auth.broadcast.broadcast_not_found", { lang: this.lang }),
      );
    }
    if (broadcast.buyer.toString() !== requesterId) {
      throw new ForbiddenException(
        this.i18n.translate("auth.broadcast.not_broadcast_owner", { lang: this.lang }),
      );
    }

    const offers = await this.offerModel
      .find({ broadcast: broadcast._id })
      .populate("offerer", "name image")
      .sort({ createdAt: -1 });

    return { data: { broadcast, offers } };
  }

  async respondToOffer(offerId: string, requesterId: string, action: "accept" | "decline") {
    if (!Types.ObjectId.isValid(offerId)) {
      throw new NotFoundException(
        this.i18n.translate("auth.broadcast.offer_not_found", { lang: this.lang }),
      );
    }
    const offer = await this.offerModel.findById(offerId);
    if (!offer) {
      throw new NotFoundException(
        this.i18n.translate("auth.broadcast.offer_not_found", { lang: this.lang }),
      );
    }
    if (offer.creator.toString() !== requesterId) {
      throw new ForbiddenException(
        this.i18n.translate("auth.broadcast.not_broadcast_owner", { lang: this.lang }),
      );
    }
    if (offer.status !== "pending") {
      throw new BadRequestException(
        this.i18n.translate("auth.broadcast.offer_already_responded", { lang: this.lang }),
      );
    }

    offer.status = action === "accept" ? "accepted" : "declined";
    offer.respondedAt = new Date();
    await offer.save();

    this.notificationsService
      .createAndNotify(
        offer.offerer.toString(),
        action === "accept" ? "broadcast.offer_accepted" : "broadcast.offer_declined",
        "BROADCAST",
        { thread: { id: offer.thread, broadcast: offer.broadcast }, offer },
        {},
      )
      .catch((err) => console.error("Failed to send offer-response notification:", err));

    this.broadcastGateway.emitToThreadAndUser(offer.thread.toString(), offer.offerer.toString(), {
      type: "offer_status",
      offer,
    });

    return {
      data: {
        offer,
        threadId: offer.thread,
        broadcastId: offer.broadcast,
      },
    };
  }
}
