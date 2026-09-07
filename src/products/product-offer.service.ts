import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  Logger,
  NotFoundException,
} from "@nestjs/common";
import { Cron, CronExpression } from "@nestjs/schedule";
import { I18nService } from "nestjs-i18n";
import { ClsService } from "nestjs-cls";

import { ProductsService } from "./products.service";
import { NotificationsService } from "src/notifications/notifications.service";
import { ChatService } from "src/chat/chat.service";
import { CreateProductOfferDto } from "./dto/create-product-offer.dto";
import { PrismaService } from "src/prisma/prisma.service";
import { generateObjectId, isObjectIdLike } from "src/common/utils/object-id.util";
import type { ProductOffer } from "./model/product.model";

/** Max times a buyer may be declined on the same listing before they're locked out of re-offering. */
const MAX_DECLINED_OFFERS = 3;

/** A pending offer nobody responds to within this many days auto-expires. */
const OFFER_EXPIRY_DAYS = 3;

@Injectable()
export class ProductOfferService {
  private readonly logger = new Logger(ProductOfferService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly productsService: ProductsService,
    private readonly notificationsService: NotificationsService,
    private readonly chatService: ChatService,
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

  /** Comma-separated, matching how prices are shown everywhere else in the app. */
  private formatPrice(price: number): string {
    return price.toLocaleString("en-US");
  }

  /** Consecutive declines since the last accepted offer (an accept resets the streak to 0). */
  private getActiveDeclineCount(offers: Pick<ProductOffer, "status">[]): number {
    let declinedCount = 0;
    for (const offer of offers) {
      if (offer.status === "accepted") declinedCount = 0;
      else if (offer.status === "declined") declinedCount += 1;
    }
    return declinedCount;
  }

  async submitOffer(offererId: string, dto: CreateProductOfferDto) {
    if (!isObjectIdLike(dto.productId)) {
      throw new NotFoundException(
        this.i18n.translate("auth.products.product_not_found", { lang: this.lang }),
      );
    }
    const product = await this.prisma.product.findFirst({
      where: { id: dto.productId, isDeleted: false, isDisabled: false },
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

    const priorOffers = await this.prisma.productOffer.findMany({
      where: { productId: product.id, offererId },
      orderBy: { createdAt: "asc" },
    });
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

    const offer = await this.prisma.productOffer.create({
      data: {
        id: generateObjectId(),
        productId: product.id,
        offererId,
        sellerId,
        price: dto.price != null ? Math.round(dto.price) : null,
        message: message.slice(0, 1000),
        status: "pending",
      },
    });

    this.notificationsService
      .createAndNotify(
        sellerId,
        "product_offer_submitted",
        "PRODUCT_OFFER",
        { productId: product.id, offerId: offer.id, id: product.id },
        { productTitle: product.title ?? "" },
      )
      .catch((err) =>
        this.logger.error("Failed to send product-offer-submitted notification", err),
      );

    this.chatService
      .getOrCreateConversation(offererId, sellerId, product.id)
      .catch((err) => this.logger.error("Failed to create product chat on new offer", err));

    return {
      data: {
        offer: this.withLegacyId(offer),
        remainingOffers: MAX_DECLINED_OFFERS - declinedCount - 1,
      },
    };
  }

  /** Products the current user owns that have at least one offer — grouped with a count. */
  async getMyReceivedOffers(sellerId: string, page = 1, limit = 10) {
    const pageNum = Number(page) || 1;
    const limitNum = Number(limit) || 10;
    const skip = (pageNum - 1) * limitNum;

    // Was a $group + $lookup(products) + $project pipeline, run twice (the
    // second time only to $count). groupBy does the first half; the products
    // are fetched once for the page rather than joined per row.
    const [groups, distinctCount] = await Promise.all([
      this.prisma.productOffer.groupBy({
        by: ["productId"],
        where: { sellerId },
        _count: { _all: true },
        _max: { createdAt: true },
        orderBy: { _max: { createdAt: "desc" } },
        skip,
        take: limitNum,
      }),
      this.prisma.$queryRaw<{ count: bigint }[]>`
        SELECT count(DISTINCT product_id) AS count
        FROM product_offers
        WHERE seller_id = ${sellerId}
      `,
    ]);

    const products = await this.prisma.product.findMany({
      where: { id: { in: groups.map((g) => g.productId) } },
    });
    const productsById = new Map(products.map((p) => [p.id, p]));

    const rows = groups.map((g) => ({
      productId: g.productId,
      offerCount: g._count._all,
      latestOfferAt: g._max.createdAt,
      product: productsById.get(g.productId)
        ? this.withLegacyId(productsById.get(g.productId)!)
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

  /** All offers on one product — only that product's owner may view them. */
  async getOffersForProduct(productId: string, requesterId: string) {
    if (!isObjectIdLike(productId)) {
      throw new NotFoundException(
        this.i18n.translate("auth.products.product_not_found", { lang: this.lang }),
      );
    }
    const product = await this.prisma.product.findUnique({ where: { id: productId } });
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

    const offers = await this.prisma.productOffer.findMany({
      where: { productId: product.id },
      include: { offerer: { select: { id: true, name: true, image: true } } },
      orderBy: { createdAt: "desc" },
    });

    return {
      data: {
        product: this.withLegacyId(product),
        offers: offers.map(({ offerer, ...o }) => ({
          ...this.withLegacyId(o),
          offerer: offerer ? { ...offerer, _id: offerer.id } : null,
        })),
      },
    };
  }

  /** Offers the current user has submitted (as a buyer), flat and newest-first. */
  async getMySentOffers(offererId: string, page = 1, limit = 10) {
    const pageNum = Number(page) || 1;
    const limitNum = Number(limit) || 10;
    const skip = (pageNum - 1) * limitNum;

    const [offers, total] = await Promise.all([
      this.prisma.productOffer.findMany({
        where: { offererId },
        include: {
          product: { select: { id: true, title: true, price: true, images: true } },
          seller: { select: { id: true, name: true, image: true } },
        },
        orderBy: { createdAt: "desc" },
        skip,
        take: limitNum,
      }),
      this.prisma.productOffer.count({ where: { offererId } }),
    ]);

    return {
      data: offers.map(({ product, seller, ...o }) => ({
        ...this.withLegacyId(o),
        product: product ? { ...product, _id: product.id } : null,
        seller: seller ? { ...seller, _id: seller.id } : null,
      })),
      meta: {
        total,
        page: pageNum,
        limit: limitNum,
        totalPages: Math.ceil(total / limitNum),
      },
    };
  }

  async respondToOffer(offerId: string, requesterId: string, action: "accept" | "decline") {
    if (!isObjectIdLike(offerId)) {
      throw new NotFoundException(
        this.i18n.translate("auth.products.offer_not_found", { lang: this.lang }),
      );
    }
    const existing = await this.prisma.productOffer.findUnique({ where: { id: offerId } });
    if (!existing) {
      throw new NotFoundException(
        this.i18n.translate("auth.products.offer_not_found", { lang: this.lang }),
      );
    }
    if (existing.sellerId !== requesterId) {
      throw new ForbiddenException(
        this.i18n.translate("auth.products.not_listing_owner", { lang: this.lang }),
      );
    }
    if (existing.status !== "pending") {
      throw new BadRequestException(
        this.i18n.translate("auth.products.offer_already_responded", { lang: this.lang }),
      );
    }

    const offer = await this.prisma.productOffer.update({
      where: { id: offerId },
      data: {
        status: action === "accept" ? "accepted" : "declined",
        respondedAt: new Date(),
      },
    });

    this.notificationsService
      .createAndNotify(
        offer.offererId,
        action === "accept" ? "product_offer_accepted" : "product_offer_declined",
        "PRODUCT_OFFER",
        { productId: offer.productId, offerId: offer.id, id: offer.productId },
        {},
      )
      .catch((err) =>
        this.logger.error("Failed to send product-offer-response notification", err),
      );

    let remainingOffers: number | undefined;
    if (action === "decline") {
      const priorOffers = await this.prisma.productOffer.findMany({
        where: { productId: offer.productId, offererId: offer.offererId },
        orderBy: { createdAt: "asc" },
      });
      remainingOffers = Math.max(
        0,
        MAX_DECLINED_OFFERS - this.getActiveDeclineCount(priorOffers),
      );
    }

    const priceText = offer.price != null ? this.formatPrice(offer.price) : null;
    // Buyer sent the offer, seller responded to it — the two sides need different
    // wording for the same event ("You sent an offer (Accepted)" is only true for
    // the buyer). `chatText` is what the buyer (message.receiver) sees; `senderText`
    // is what the seller (message.sender) sees instead.
    const chatMessageKey =
      action === "accept"
        ? priceText
          ? "offer_accepted_chat_with_price"
          : "offer_accepted_chat_no_price"
        : priceText
          ? "offer_declined_chat_with_price"
          : "offer_declined_chat_no_price";
    const sellerChatMessageKey =
      action === "accept"
        ? priceText
          ? "offer_accepted_chat_seller_with_price"
          : "offer_accepted_chat_seller_no_price"
        : priceText
          ? "offer_declined_chat_seller_with_price"
          : "offer_declined_chat_seller_no_price";
    let chatText = this.i18n.translate(`auth.products.${chatMessageKey}`, {
      lang: this.lang,
      args: { price: priceText },
    }) as string;
    const sellerText = this.i18n.translate(`auth.products.${sellerChatMessageKey}`, {
      lang: this.lang,
      args: { price: priceText },
    }) as string;

    if (action === "decline" && remainingOffers !== undefined) {
      // Only the buyer can make another offer, so this addendum is buyer-only —
      // it never gets appended to the seller-facing `senderText`.
      const remainingKey =
        remainingOffers > 0
          ? "offer_declined_remaining_chances"
          : "offer_declined_no_more_chances";
      const remainingText = this.i18n.translate(`auth.products.${remainingKey}`, {
        lang: this.lang,
        args: { remainingOffers },
      }) as string;
      chatText = `${chatText} ${remainingText}`;
    }

    this.chatService
      .getOrCreateConversation(offer.offererId, offer.sellerId, offer.productId)
      .then(async (conversation) => {
        await this.chatService.sendMessage(
          conversation._id,
          offer.sellerId,
          offer.offererId,
          chatText,
          undefined,
          { skipNotification: true, senderText: sellerText },
        );
      })
      .catch((err) =>
        this.logger.error("Failed to send offer-response chat message", err),
      );

    if (action === "decline") {
      return { data: { offer: this.withLegacyId(offer), remainingOffers } };
    }

    return { data: { offer: this.withLegacyId(offer) } };
  }

  /** Runs hourly: a pending offer nobody responded to within OFFER_EXPIRY_DAYS
   *  auto-expires — freeing the buyer to make a new one on that listing, and
   *  telling them it expired via a notification + chat message, the same way
   *  an explicit accept/decline would. */
  @Cron(CronExpression.EVERY_HOUR)
  async expireStaleOffers() {
    const cutoff = new Date(Date.now() - OFFER_EXPIRY_DAYS * 24 * 60 * 60 * 1000);
    const staleOffers = await this.prisma.productOffer.findMany({
      where: { status: "pending", createdAt: { lte: cutoff } },
      include: { product: { select: { id: true, title: true } } },
    });

    for (const offer of staleOffers) {
      await this.prisma.productOffer.update({
        where: { id: offer.id },
        data: { status: "expired", respondedAt: new Date() },
      });

      const productId = offer.product?.id ?? offer.productId;
      const productTitle = offer.product?.title ?? "";

      this.notificationsService
        .createAndNotify(
          offer.offererId,
          "product_offer_expired",
          "PRODUCT_OFFER",
          { productId, offerId: offer.id, id: productId },
          { productTitle },
        )
        .catch((err) =>
          this.logger.error("Failed to send product-offer-expired notification", err),
        );

      const priceText = offer.price != null ? this.formatPrice(offer.price) : null;
      const chatText = this.i18n.translate(
        `auth.products.${priceText ? "offer_expired_chat_with_price" : "offer_expired_chat_no_price"}`,
        { lang: "en", args: { price: priceText } },
      ) as string;
      const sellerText = this.i18n.translate(
        `auth.products.${priceText ? "offer_expired_chat_seller_with_price" : "offer_expired_chat_seller_no_price"}`,
        { lang: "en", args: { price: priceText } },
      ) as string;

      this.chatService
        .getOrCreateConversation(offer.offererId, offer.sellerId)
        .then((conversation) =>
          this.chatService.sendMessage(
            conversation._id,
            offer.sellerId,
            offer.offererId,
            chatText,
            undefined,
            { skipNotification: true, senderText: sellerText },
          ),
        )
        .catch((err) =>
          this.logger.error("Failed to send offer-expired chat message", err),
        );
    }

    return staleOffers.length;
  }
}
