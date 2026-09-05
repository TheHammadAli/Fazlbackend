import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from "@nestjs/common";
import { InjectModel } from "@nestjs/mongoose";
import { Cron, CronExpression } from "@nestjs/schedule";
import { Model, Types } from "mongoose";
import { I18nService } from "nestjs-i18n";
import { ClsService } from "nestjs-cls";

import { Product } from "./schema/product.schema";
import { ProductOffer } from "./schema/product-offer.schema";
import { ProductsService } from "./products.service";
import { NotificationsService } from "src/notifications/notifications.service";
import { ChatService } from "src/chat/chat.service";
import { CreateProductOfferDto } from "./dto/create-product-offer.dto";

/** Max times a buyer may be declined on the same listing before they're locked out of re-offering. */
const MAX_DECLINED_OFFERS = 3;

/** A pending offer nobody responds to within this many days auto-expires. */
const OFFER_EXPIRY_DAYS = 3;

@Injectable()
export class ProductOfferService {
  constructor(
    @InjectModel(Product.name)
    private readonly productModel: Model<Product>,
    @InjectModel(ProductOffer.name)
    private readonly offerModel: Model<ProductOffer>,
    private readonly productsService: ProductsService,
    private readonly notificationsService: NotificationsService,
    private readonly chatService: ChatService,
    private readonly i18n: I18nService,
    private readonly cls: ClsService,
  ) {}

  private get lang(): string {
    return this.cls.get("lang") || "en";
  }

  /** Comma-separated, matching how prices are shown everywhere else in the app. */
  private formatPrice(price: number): string {
    return price.toLocaleString("en-US");
  }

  /** Consecutive declines since the last accepted offer (an accept resets the streak to 0). */
  private getActiveDeclineCount(offers: ProductOffer[]): number {
    let declinedCount = 0;
    for (const offer of offers) {
      if (offer.status === "accepted") declinedCount = 0;
      else if (offer.status === "declined") declinedCount += 1;
    }
    return declinedCount;
  }

  async submitOffer(offererId: string, dto: CreateProductOfferDto) {
    if (!Types.ObjectId.isValid(dto.productId)) {
      throw new NotFoundException(
        this.i18n.translate("auth.products.product_not_found", { lang: this.lang }),
      );
    }
    const product = await this.productModel.findOne({
      _id: dto.productId,
      isDeleted: false,
      isDisabled: false,
    });
    if (!product) {
      throw new NotFoundException(
        this.i18n.translate("auth.products.product_not_found", { lang: this.lang }),
      );
    }

    const sellerId = await this.productsService.resolveProductOwnerId(product);
    if (!sellerId) {
      throw new NotFoundException(
        this.i18n.translate("auth.products.user_not_found", { lang: this.lang }),
      );
    }
    if (sellerId === offererId) {
      throw new BadRequestException(
        this.i18n.translate("auth.products.offer_own_listing", { lang: this.lang }),
      );
    }

    const priorOffers = await this.offerModel
      .find({ product: product._id, offerer: new Types.ObjectId(offererId) })
      .sort({ createdAt: 1 });
    if (priorOffers.some((o) => o.status === "pending")) {
      throw new BadRequestException(
        this.i18n.translate("auth.products.offer_already_submitted", { lang: this.lang }),
      );
    }
    const declinedCount = this.getActiveDeclineCount(priorOffers);
    if (declinedCount >= MAX_DECLINED_OFFERS) {
      throw new BadRequestException(
        this.i18n.translate("auth.products.offer_limit_reached", { lang: this.lang }),
      );
    }

    // Price is optional — an offer can be just a message. If given, it must
    // still be a positive number.
    if (dto.price != null && (!Number.isFinite(dto.price) || dto.price <= 0)) {
      throw new BadRequestException(
        this.i18n.translate("auth.products.offer_price_invalid", { lang: this.lang }),
      );
    }
    const message = dto.message?.trim();
    if (!message) {
      throw new BadRequestException(
        this.i18n.translate("auth.products.offer_message_required", { lang: this.lang }),
      );
    }

    const offer = await this.offerModel.create({
      product: product._id,
      offerer: new Types.ObjectId(offererId),
      seller: new Types.ObjectId(sellerId),
      price: dto.price ?? null,
      message,
      status: "pending",
    });

    this.notificationsService
      .createAndNotify(
        sellerId,
        "product_offer_submitted",
        "PRODUCT_OFFER",
        {
          productId: product._id.toString(),
          offerId: (offer._id as Types.ObjectId).toString(),
          id: product._id.toString(),
        },
        { productTitle: product.title ?? "" },
      )
      .catch((err) => console.error("Failed to send product-offer-submitted notification:", err));

    this.chatService
      .getOrCreateConversation(offererId, sellerId, product._id.toString())
      .catch((err) => console.error("Failed to create product chat on new offer:", err));

    return {
      data: {
        offer,
        remainingOffers: MAX_DECLINED_OFFERS - declinedCount - 1,
      },
    };
  }

  /** Products the current user owns that have at least one offer — grouped with a count. */
  async getMyReceivedOffers(sellerId: string, page = 1, limit = 10) {
    const pageNum = Number(page) || 1;
    const limitNum = Number(limit) || 10;
    const skip = (pageNum - 1) * limitNum;
    const sellerObjectId = new Types.ObjectId(sellerId);

    const basePipeline: any[] = [
      { $match: { seller: sellerObjectId } },
      {
        $group: {
          _id: "$product",
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
              from: "products",
              localField: "_id",
              foreignField: "_id",
              as: "product",
            },
          },
          { $unwind: { path: "$product", preserveNullAndEmptyArrays: true } },
          {
            $project: {
              _id: 0,
              productId: "$_id",
              offerCount: 1,
              latestOfferAt: 1,
              product: 1,
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

  /** All offers on one product — only that product's owner may view them. */
  async getOffersForProduct(productId: string, requesterId: string) {
    if (!Types.ObjectId.isValid(productId)) {
      throw new NotFoundException(
        this.i18n.translate("auth.products.product_not_found", { lang: this.lang }),
      );
    }
    const product = await this.productModel.findById(productId);
    if (!product) {
      throw new NotFoundException(
        this.i18n.translate("auth.products.product_not_found", { lang: this.lang }),
      );
    }
    const ownerId = await this.productsService.resolveProductOwnerId(product);
    if (ownerId !== requesterId) {
      throw new ForbiddenException(
        this.i18n.translate("auth.products.not_listing_owner", { lang: this.lang }),
      );
    }

    const offers = await this.offerModel
      .find({ product: product._id })
      .populate("offerer", "name image")
      .sort({ createdAt: -1 });

    return { data: { product, offers } };
  }

  /** Offers the current user has submitted (as a buyer), flat and newest-first. */
  async getMySentOffers(offererId: string, page = 1, limit = 10) {
    const pageNum = Number(page) || 1;
    const limitNum = Number(limit) || 10;
    const skip = (pageNum - 1) * limitNum;
    const offererObjectId = new Types.ObjectId(offererId);

    const [offers, total] = await Promise.all([
      this.offerModel
        .find({ offerer: offererObjectId })
        .populate("product", "title price images")
        .populate("seller", "name image")
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

  async respondToOffer(offerId: string, requesterId: string, action: "accept" | "decline") {
    if (!Types.ObjectId.isValid(offerId)) {
      throw new NotFoundException(
        this.i18n.translate("auth.products.offer_not_found", { lang: this.lang }),
      );
    }
    const offer = await this.offerModel.findById(offerId);
    if (!offer) {
      throw new NotFoundException(
        this.i18n.translate("auth.products.offer_not_found", { lang: this.lang }),
      );
    }
    if (offer.seller.toString() !== requesterId) {
      throw new ForbiddenException(
        this.i18n.translate("auth.products.not_listing_owner", { lang: this.lang }),
      );
    }
    if (offer.status !== "pending") {
      throw new BadRequestException(
        this.i18n.translate("auth.products.offer_already_responded", { lang: this.lang }),
      );
    }

    offer.status = action === "accept" ? "accepted" : "declined";
    offer.respondedAt = new Date();
    await offer.save();

    this.notificationsService
      .createAndNotify(
        offer.offerer.toString(),
        action === "accept" ? "product_offer_accepted" : "product_offer_declined",
        "PRODUCT_OFFER",
        {
          productId: offer.product.toString(),
          offerId: (offer._id as Types.ObjectId).toString(),
          id: offer.product.toString(),
        },
        {},
      )
      .catch((err) => console.error("Failed to send product-offer-response notification:", err));

    let remainingOffers: number | undefined;
    if (action === "decline") {
      const priorOffers = await this.offerModel
        .find({ product: offer.product, offerer: offer.offerer })
        .sort({ createdAt: 1 });
      remainingOffers = Math.max(0, MAX_DECLINED_OFFERS - this.getActiveDeclineCount(priorOffers));
    }

    const priceText = offer.price != null ? this.formatPrice(offer.price) : null;
    const chatMessageKey =
      action === "accept"
        ? priceText ? "offer_accepted_chat_with_price" : "offer_accepted_chat_no_price"
        : priceText ? "offer_declined_chat_with_price" : "offer_declined_chat_no_price";
    let chatText = this.i18n.translate(`auth.products.${chatMessageKey}`, {
      lang: this.lang,
      args: { price: priceText },
    }) as string;

    if (action === "decline" && remainingOffers !== undefined) {
      const remainingKey =
        remainingOffers > 0 ? "offer_declined_remaining_chances" : "offer_declined_no_more_chances";
      const remainingText = this.i18n.translate(`auth.products.${remainingKey}`, {
        lang: this.lang,
        args: { remainingOffers },
      }) as string;
      chatText = `${chatText} ${remainingText}`;
    }

    this.chatService
      .getOrCreateConversation(
        offer.offerer.toString(),
        offer.seller.toString(),
        offer.product.toString(),
      )
      .then(async (conversation) => {
        const conversationId = (conversation._id as Types.ObjectId).toString();
        await this.chatService.sendMessage(
          conversationId,
          offer.seller.toString(),
          offer.offerer.toString(),
          chatText,
          undefined,
          { skipNotification: true },
        );
      })
      .catch((err) => console.error("Failed to send offer-response chat message:", err));

    if (action === "decline") {
      return { data: { offer, remainingOffers } };
    }

    return { data: { offer } };
  }

  /** Runs hourly: a pending offer nobody responded to within OFFER_EXPIRY_DAYS
   *  auto-expires — freeing the buyer to make a new one on that listing, and
   *  telling them it expired via a notification + chat message, the same way
   *  an explicit accept/decline would. */
  @Cron(CronExpression.EVERY_HOUR)
  async expireStaleOffers() {
    const cutoff = new Date(Date.now() - OFFER_EXPIRY_DAYS * 24 * 60 * 60 * 1000);
    const staleOffers = await this.offerModel
      .find({ status: "pending", createdAt: { $lte: cutoff } })
      .populate<{ product: { _id: Types.ObjectId; title?: string } }>("product", "title");

    for (const offer of staleOffers) {
      offer.status = "expired";
      offer.respondedAt = new Date();
      await offer.save();

      const productId = (offer.product as any)?._id?.toString() ?? offer.product.toString();
      const productTitle = (offer.product as any)?.title ?? "";

      this.notificationsService
        .createAndNotify(
          offer.offerer.toString(),
          "product_offer_expired",
          "PRODUCT_OFFER",
          {
            productId,
            offerId: (offer._id as Types.ObjectId).toString(),
            id: productId,
          },
          { productTitle },
        )
        .catch((err) => console.error("Failed to send product-offer-expired notification:", err));

      const priceText = offer.price != null ? this.formatPrice(offer.price) : null;
      const chatText = this.i18n.translate(
        `auth.products.${priceText ? "offer_expired_chat_with_price" : "offer_expired_chat_no_price"}`,
        { lang: "en", args: { price: priceText } },
      ) as string;

      this.chatService
        .getOrCreateConversation(offer.offerer.toString(), offer.seller.toString())
        .then((conversation) =>
          this.chatService.sendMessage(
            (conversation._id as Types.ObjectId).toString(),
            offer.seller.toString(),
            offer.offerer.toString(),
            chatText,
            undefined,
            { skipNotification: true },
          ),
        )
        .catch((err) => console.error("Failed to send offer-expired chat message:", err));
    }

    return staleOffers.length;
  }
}
