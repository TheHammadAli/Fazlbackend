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

import { Product } from "./schema/product.schema";
import { ProductOffer } from "./schema/product-offer.schema";
import { ProductsService } from "./products.service";
import { NotificationsService } from "src/notifications/notifications.service";
import { CreateProductOfferDto } from "./dto/create-product-offer.dto";

@Injectable()
export class ProductOfferService {
  constructor(
    @InjectModel(Product.name)
    private readonly productModel: Model<Product>,
    @InjectModel(ProductOffer.name)
    private readonly offerModel: Model<ProductOffer>,
    private readonly productsService: ProductsService,
    private readonly notificationsService: NotificationsService,
    private readonly i18n: I18nService,
    private readonly cls: ClsService,
  ) {}

  private get lang(): string {
    return this.cls.get("lang") || "en";
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

    const existing = await this.offerModel.findOne({
      product: product._id,
      offerer: new Types.ObjectId(offererId),
    });
    if (existing) {
      throw new BadRequestException(
        this.i18n.translate("auth.products.offer_already_submitted", { lang: this.lang }),
      );
    }

    if (!Number.isFinite(dto.price) || dto.price <= 0) {
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
      price: dto.price,
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

    return { data: { offer } };
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

    return { data: { offer } };
  }
}
