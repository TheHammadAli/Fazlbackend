import {
  Injectable,
  Logger,
  NotFoundException,
  ConflictException,
  forwardRef,
  Inject,
} from "@nestjs/common";
import { I18nService } from "nestjs-i18n";
import { ClsService } from "nestjs-cls";
import { PrismaService } from "src/prisma/prisma.service";
import { generateObjectId } from "src/common/utils/object-id.util";
import { CreateLikeDto, RemoveLikeDto } from "./dto/like.dto";
import { ProductsService } from "src/products/products.service";
import { ServicesService } from "src/services/services.service";
import { NotificationsService } from "src/notifications/notifications.service";
import { UsersService } from "src/users/users.service";
import type {
  ItemType,
  Like,
  LikeItem,
  OwnerModel,
  PopulatedLikeItem,
} from "./model/like.model";

export type { LikeItem, PopulatedLikeItem } from "./model/like.model";

@Injectable()
export class LikeService {
  constructor(
    private readonly prisma: PrismaService,
    @Inject(forwardRef(() => ProductsService))
    private readonly productsService: ProductsService,
    @Inject(forwardRef(() => ServicesService))
    private readonly servicesService: ServicesService,
    private readonly i18n: I18nService,
    private readonly cls: ClsService,
    private readonly notificationsService: NotificationsService,
    @Inject(forwardRef(() => UsersService))
    private readonly usersService: UsersService,
  ) {}

  private readonly logger = new Logger(LikeService.name);

  private get lang(): string {
    return this.cls.get("lang") || "en";
  }

  /**
   * Add a like/favorite
   */
  async addLike(
    userId: string,
    dto: CreateLikeDto,
  ): Promise<{ message: string; data: Like }> {
    const item = await this.validateItemExists(dto.itemId, dto.itemType);

    const existingLike = await this.prisma.like.findUnique({
      where: {
        userId_itemId_itemType: {
          userId,
          itemId: dto.itemId,
          itemType: dto.itemType as ItemType,
        },
      },
    });

    if (existingLike) {
      throw new ConflictException(
        this.i18n.translate("auth.like.already_liked", { lang: this.lang }),
      );
    }

    const results = await this.prisma.like.create({
      data: {
        id: generateObjectId(),
        userId,
        itemId: dto.itemId,
        itemType: dto.itemType as ItemType,
        ownerModel: dto.ownerModel as OwnerModel,
      },
    });

    this.notifyOwnerOfLike(userId, dto, item);

    return {
      message: this.i18n.translate("auth.like.created_success", {
        lang: this.lang,
      }),
      data: results,
    };
  }

  /**
   * Remove like
   */
  async removeLike(
    userId: string,
    dto: RemoveLikeDto,
  ): Promise<{ message: string }> {
    // deleteMany rather than delete: it reports how many rows matched instead of
    // throwing P2025, so the "not found" path stays an explicit 404 as before.
    const result = await this.prisma.like.deleteMany({
      where: { userId, itemId: dto.itemId, itemType: dto.itemType as ItemType },
    });

    if (result.count === 0) {
      throw new NotFoundException(
        this.i18n.translate("auth.like.not_found", { lang: this.lang }),
      );
    }

    return {
      message: this.i18n.translate("auth.like.removed", { lang: this.lang }),
    };
  }

  /**
   * Get likes for a user
   */
  async getLikesByUser(
    userId: string,
    itemType?: ItemType,
    ids?: string[],
  ): Promise<PopulatedLikeItem[]> {
    if (!userId) {
      return [];
    }

    const likes = await this.prisma.like.findMany({
      where: {
        userId,
        ...(itemType ? { itemType } : {}),
        ...(ids && ids.length > 0 ? { itemId: { in: ids } } : {}),
      },
      orderBy: { createdAt: "desc" },
    });

    const populatedLikes = await Promise.all(
      likes.map(async (like) => {
        if (!like.itemId) return null;

        let itemDetails: any = null;

        try {
          if (like.itemType === "product") {
            itemDetails = await this.productsService.getById(like.itemId);
          } else if (like.itemType === "service") {
            itemDetails = await this.servicesService.getById(like.itemId);
          }
        } catch {
          // A like pointing at a listing that has since been removed is not an
          // error — it is simply dropped from the result, as before.
        }

        if (!itemDetails) return null;

        return {
          ...like,
          // Clients read `_id`; the response interceptor also mirrors it, but
          // this keeps the shape right for callers that use the value directly.
          _id: like.id,
          itemDetails,
        } as PopulatedLikeItem;
      }),
    );

    return populatedLikes.filter(Boolean) as PopulatedLikeItem[];
  }

  /**
   * Check if liked
   */
  async isLiked(
    userId: string,
    itemId: string,
    itemType: ItemType,
  ): Promise<boolean> {
    const existing = await this.prisma.like.findUnique({
      where: { userId_itemId_itemType: { userId, itemId, itemType } },
      select: { id: true },
    });

    return existing !== null;
  }

  /**
   * Count likes
   */
  async getLikeCount(itemId: string, itemType: ItemType): Promise<number> {
    return this.prisma.like.count({ where: { itemId, itemType } });
  }

  /**
   * Admin: total like count across the whole platform (products + services combined) —
   * powers the "Total Likes" card on the admin dashboard.
   */
  async getTotalLikeCount(): Promise<{
    total: number;
    product: number;
    service: number;
  }> {
    const [product, service] = await Promise.all([
      this.prisma.like.count({ where: { itemType: "product" } }),
      this.prisma.like.count({ where: { itemType: "service" } }),
    ]);
    return { total: product + service, product, service };
  }

  /**
   * Admin: paginated list of the users who liked one item, newest first —
   * powers the "who liked this" drill-down on the admin Feed page.
   */
  async getLikersForItem(
    itemId: string,
    itemType: ItemType,
    page = 1,
    limit = 20,
  ): Promise<{
    data: unknown[];
    meta: { total: number; page: number; limit: number; totalPages: number };
  }> {
    const pageNum = Number(page) || 1;
    const limitNum = Number(limit) || 20;
    const skip = (pageNum - 1) * limitNum;
    const where = { itemId, itemType };

    const [rows, total] = await Promise.all([
      this.prisma.like.findMany({
        where,
        orderBy: { createdAt: "desc" },
        skip,
        take: limitNum,
        select: {
          id: true,
          createdAt: true,
          user: { select: { id: true, name: true, email: true, image: true } },
        },
      }),
      this.prisma.like.count({ where }),
    ]);

    return {
      data: rows,
      meta: { total, page: pageNum, limit: limitNum, totalPages: Math.ceil(total / limitNum) },
    };
  }

  /**
   * Bulk like counts for a page of items, in one query.
   */
  async getLikeCountsForItems(
    itemIds: string[],
    itemType: ItemType,
  ): Promise<Map<string, number>> {
    if (itemIds.length === 0) return new Map();

    const results = await this.prisma.like.groupBy({
      by: ["itemId"],
      where: { itemId: { in: itemIds }, itemType },
      _count: { _all: true },
    });

    return new Map(results.map((r) => [r.itemId, r._count._all]));
  }

  /**
   * Tells the owner that someone liked their listing or service.
   *
   * Deliberately not awaited: a notification problem must never fail the like the
   * user actually asked for, and createAndNotify throws when the recipient no
   * longer exists. Same fire-and-forget shape orders.service uses.
   *
   * The payload is flat scalars on purpose — a tapped tray notification arrives
   * as a flat object of strings, so anything nested would have to be JSON-parsed
   * again on the device.
   */
  private notifyOwnerOfLike(
    likerId: string,
    dto: CreateLikeDto,
    item: any,
  ): void {
    const ownerUserId = this.resolveOwnerUserId(item, dto.itemType);

    // Nothing to say when the item has no owner, or when someone likes their own.
    if (!ownerUserId || ownerUserId === String(likerId)) return;

    void (async () => {
      try {
        const liker = await this.usersService.findUserById(String(likerId));

        await this.notificationsService.createAndNotify(
          ownerUserId,
          dto.itemType === "product" ? "like_product" : "like_service",
          "LIKE",
          { itemType: dto.itemType, itemId: String(dto.itemId) },
          {
            likerName: liker?.name || "Someone",
            title: item?.title || "",
          },
        );
      } catch (err) {
        this.logger.warn(
          `Like notification not sent for ${dto.itemType} ${dto.itemId}: ${(err as Error)?.message}`,
        );
      }
    })();
  }

  /**
   * Validate item exists, and hand the caller the item it just fetched.
   *
   * Returning it rather than discarding it is what lets addLike name the item and
   * find its owner without a second round trip — both getById calls already
   * populate the owner.
   */
  private async validateItemExists(
    itemId: string,
    itemType: ItemType,
  ): Promise<any> {
    if (itemType === "product") {
      const product = await this.productsService.getById(itemId);

      if (!product) {
        throw new NotFoundException(
          this.i18n.translate("auth.like.product_not_found", {
            lang: this.lang,
          }),
        );
      }
      return product;
    }

    const service = await this.servicesService.getById(itemId);

    if (!service) {
      throw new NotFoundException(
        this.i18n.translate("auth.like.service_not_found", {
          lang: this.lang,
        }),
      );
    }
    return service;
  }

  /**
   * The user who should hear about a like on this item.
   *
   * A service always has an ownerId. A product's is optional: one listed under a
   * shop carries the real user on the shop instead, the same split orders.service
   * has to handle when it notifies a seller.
   */
  private resolveOwnerUserId(item: any, itemType: ItemType): string | null {
    const owner =
      itemType === "product"
        ? (item?.ownerId?._id ?? item?.ownerId ?? item?.shopId?.ownerId?._id)
        : (item?.ownerId?._id ?? item?.ownerId);

    return owner ? String(owner) : null;
  }
}
