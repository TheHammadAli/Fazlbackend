import {
  Injectable,
  NotFoundException,
  BadRequestException,
  Inject,
  forwardRef,
} from "@nestjs/common";
import { I18nService } from "nestjs-i18n";
import { ClsService } from "nestjs-cls";
import { PrismaService } from "src/prisma/prisma.service";
import { resolvePagination } from "src/common/utils/pagination.util";
import { generateObjectId, isObjectIdLike } from "src/common/utils/object-id.util";
import { deliveryOption as deliveryOptionWire } from "src/common/utils/enum-wire.util";
import { CreateOrderDto } from "./dto/create-order-dto";
import { UpdateOrderDto } from "./dto/update-order-dto";
import { UsersService } from "src/users/users.service";
import { ProductsService } from "src/products/products.service";
import { ShopService } from "src/shop/shop.service";
import { NotificationsService } from "src/notifications/notifications.service";
import {
  ORDER_ACTIONS,
  type Order,
  type OrderPaymentType,
  type OrderStatus,
  type OwnerModel,
} from "./model/order.model";
import type {
  Prisma,
  // Prisma's own enum type uses the identifier (self_pickup); the DeliveryOption
  // exported from the model file is the wire union ("self-pickup"), which is what
  // the DTOs and Swagger describe. Both are needed, so they are aliased apart.
  DeliveryOption as PrismaDeliveryOption,
} from "../../generated/prisma/client";

/**
 * Reads an id off a value that may be a raw id, a Mongoose document, or a
 * Prisma row. The services this one depends on are converted at different
 * times, so both shapes have to be tolerated during the migration.
 */
function idOf(value: unknown): string | undefined {
  if (value === null || value === undefined) return undefined;
  if (typeof value === "string") return value;
  const v = value as { id?: unknown; _id?: unknown };
  if (v.id !== undefined && v.id !== null) return String(v.id);
  if (v._id !== undefined && v._id !== null) return String(v._id);
  return undefined;
}

@Injectable()
export class OrdersService {
  constructor(
    private readonly prisma: PrismaService,
    @Inject(forwardRef(() => UsersService))
    private readonly usersService: UsersService,
    @Inject(forwardRef(() => ProductsService))
    private readonly productsService: ProductsService,
    @Inject(forwardRef(() => ShopService))
    private readonly shopService: ShopService,
    @Inject(forwardRef(() => NotificationsService))
    private readonly notificationsService: NotificationsService,
    private readonly i18n: I18nService,
    private readonly cls: ClsService,
  ) {}

  private readonly constants = { orders: ORDER_ACTIONS };

  /** Dynamic getter for the current request language */
  private get lang(): string {
    return this.cls.get("lang") || "en";
  }

  /**
   * Collapses the two typed owner columns back into the single `owner` field
   * clients have always received.
   */
  private toApiShape<T extends Record<string, any>>(order: T): T {
    if (!order) return order;
    const { shopOwner, userOwner, ...rest } = order as any;
    return {
      ...rest,
      // DeliveryOption.self_pickup is stored as "self-pickup"; Prisma hands back
      // the identifier, and clients expect the hyphenated value.
      ...(rest.deliveryOption !== undefined
        ? { deliveryOption: deliveryOptionWire.toWire(rest.deliveryOption) }
        : {}),
      owner: shopOwner ?? userOwner ?? rest.shopOwnerId ?? rest.userOwnerId ?? null,
    } as T;
  }

  async createMultipleOrders(dto: CreateOrderDto[]) {
    const promiseResults = await Promise.all(
      dto.map(async (orderDto) => {
        try {
          return await this.createOrder(orderDto);
        } catch (error) {
          // Log the error and continue with the next order
          console.error(`Failed to create order for product ${orderDto.product}:`, error);
          return null;
        }
      }),
    );

    return {
      message: this.i18n.translate("auth.orders.created_success", { lang: this.lang }),
      data: promiseResults,
    };
  }

  // CREATE: Logic updated to include mandatory payloads and post-save notifications
  async createOrder(dto: CreateOrderDto) {
    // 1. Validation Logic
    const buyer = await this.usersService.findUserById(dto.buyer);
    if (!buyer)
      throw new NotFoundException(
        this.i18n.translate("auth.orders.buyer_not_found", { lang: this.lang }),
      );

    const product = await this.productsService.getById(dto.product);
    if (!product)
      throw new NotFoundException(
        this.i18n.translate("auth.orders.product_not_found", { lang: this.lang }),
      );

    let owner: any = null;

    if (dto.ownerModel === "Shop") {
      owner = await this.shopService.getShopById(dto.owner);
    } else if (dto.ownerModel === "User") {
      owner = await this.usersService.findUserById(dto.owner);
    }

    if (!owner)
      throw new NotFoundException(
        this.i18n.translate("auth.orders.order_owner_not_found", { lang: this.lang }),
      );

    let isValidOwner = false;
    if (dto.ownerModel === "Shop") {
      isValidOwner = dto.owner === idOf((product as any).shopId);
    } else if (dto.ownerModel === "User") {
      isValidOwner = dto.owner === idOf((product as any).ownerId);
    }

    if (!isValidOwner) {
      throw new BadRequestException(
        this.i18n.translate("auth.orders.order_mismatch", { lang: this.lang }),
      );
    }

    // 2. Prepare and Save.
    //    The refPath becomes two typed columns; the CHECK constraint requires
    //    the discriminator and the populated column to agree.
    const savedOrder = await this.prisma.order.create({
      data: {
        id: generateObjectId(),
        buyerId: dto.buyer,
        ownerModel: dto.ownerModel as OwnerModel,
        shopOwnerId: dto.ownerModel === "Shop" ? dto.owner : null,
        userOwnerId: dto.ownerModel === "User" ? dto.owner : null,
        productId: dto.product,
        deliveryOption: deliveryOptionWire.fromWire(
          dto.deliveryOption,
        ) as PrismaDeliveryOption,
        status: (dto.status ?? "pending") as OrderStatus,
        paymentType: (dto.paymentType ?? "cashonDelivery") as OrderPaymentType,
        amount: Math.round(Number(dto.amount ?? 0)),
        quantity: Math.round(Number(dto.quantity ?? 1)),
        variant: (dto.variant ?? undefined) as Prisma.InputJsonValue | undefined,
      },
    });

    // 3. Post-Save Notifications with Generic Payload
    const notificationPayload = {
      orderId: savedOrder.id,
      productId: dto.product,
      ownerModel: dto.ownerModel,
      actionType: this.constants.orders.placed,
    };

    // Notify buyer (using translation placeholders)
    this.notificationsService.createAndNotify(
      dto.buyer,
      "order_created_buyer",
      "ORDER",
      notificationPayload,
      { productTitle: (product as any).title },
    );

    // Notify owner/seller. A shop's notifications go to the user who owns it.
    const sellerUserId =
      dto.ownerModel === "Shop" ? idOf(owner.ownerId) : (idOf(owner) ?? dto.owner);

    if (sellerUserId) {
      this.notificationsService.createAndNotify(
        sellerUserId,
        "order_created_seller",
        "ORDER",
        { ...notificationPayload, actionType: this.constants.orders.received },
        { productTitle: (product as any).title },
      );
    }

    return {
      message: this.i18n.translate("auth.orders.created_success", { lang: this.lang }),
      data: this.toApiShape(savedOrder),
    };
  }

  // READ: Get by ID
  async getOrderById(orderId: string): Promise<Order> {
    if (!isObjectIdLike(orderId))
      throw new BadRequestException(
        this.i18n.translate("auth.orders.invalid_order_id", { lang: this.lang }),
      );

    const order = await this.prisma.order.findUnique({
      where: { id: orderId },
      include: {
        buyer: true,
        product: true,
        shopOwner: true,
        userOwner: true,
      },
    });

    if (!order)
      throw new NotFoundException(
        this.i18n.translate("auth.orders.order_not_found", { lang: this.lang }),
      );
    return this.toApiShape(order) as unknown as Order;
  }

  // READ: List by Owner
  async getOrdersByOwner(
    ownerId: string,
    ownerModel: "Shop" | "User",
    rawPage: number | string = 1,
    rawLimit: number | string = 10,
    status?: string,
  ): Promise<{
    data: Order[];
    meta: { total: number; page: number; limit: number; totalPages: number };
  }> {
    if (!isObjectIdLike(ownerId))
      throw new BadRequestException(
        this.i18n.translate("auth.orders.invalid_owner_id", { lang: this.lang }),
      );

    // Query params arrive as strings, so these are cast before the bounds check
    // rather than relying on JavaScript coercing them inside the comparison —
    // which silently let a non-numeric page through to Prisma as NaN.
    const page = Math.trunc(Number(rawPage));
    const limit = Math.trunc(Number(rawLimit));

    if (!Number.isFinite(page) || !Number.isFinite(limit) || page < 1 || limit < 1)
      throw new BadRequestException(
        this.i18n.translate("auth.orders.invalid_page_limit", { lang: this.lang }),
      );

    const skip = (page - 1) * limit;

    // Targets whichever typed column matches the discriminator, so an id can no
    // longer accidentally match an owner of the other kind.
    const where: Prisma.OrderWhereInput = {
      ownerModel,
      ...(ownerModel === "Shop" ? { shopOwnerId: ownerId } : { userOwnerId: ownerId }),
      ...(status ? { status: status as OrderStatus } : {}),
    };

    const [data, total] = await Promise.all([
      this.prisma.order.findMany({
        where,
        include: { product: true },
        orderBy: { createdAt: "desc" },
        skip,
        take: limit,
      }),
      this.prisma.order.count({ where }),
    ]);

    return {
      data: data.map((o) => this.toApiShape(o)) as unknown as Order[],
      meta: { total, page, limit, totalPages: Math.ceil(total / limit) },
    };
  }

  // READ: List by Buyer
  async getOrdersByBuyer(
    buyerId: string,
    rawPage: number | string = 1,
    rawLimit: number | string = 10,
    status?: string,
  ): Promise<{
    data: Order[];
    meta: { total: number; page: number; limit: number; totalPages: number };
  }> {
    if (!isObjectIdLike(buyerId))
      throw new BadRequestException(
        this.i18n.translate("auth.orders.invalid_buyer_id", { lang: this.lang }),
      );

    const where: Prisma.OrderWhereInput = {
      buyerId,
      ...(status ? { status: status as OrderStatus } : {}),
    };

    const { page, limit, skip } = resolvePagination(rawPage, rawLimit);
    const [data, total] = await Promise.all([
      this.prisma.order.findMany({
        where,
        include: { product: true, shopOwner: true, userOwner: true },
        orderBy: { createdAt: "desc" },
        skip,
        take: limit,
      }),
      this.prisma.order.count({ where }),
    ]);

    return {
      data: data.map((o) => this.toApiShape(o)) as unknown as Order[],
      meta: { total, page, limit, totalPages: Math.ceil(total / limit) },
    };
  }

  // UPDATE: Logic updated to notify on status changes
  async updateOrder(orderId: string, dto: UpdateOrderDto) {
    if (!isObjectIdLike(orderId))
      throw new BadRequestException(
        this.i18n.translate("auth.orders.invalid_order_id", { lang: this.lang }),
      );

    const existing = await this.prisma.order.findUnique({ where: { id: orderId } });
    if (!existing)
      throw new NotFoundException(
        this.i18n.translate("auth.orders.order_not_found", { lang: this.lang }),
      );

    const updated = await this.prisma.order.update({
      where: { id: orderId },
      data: {
        ...(dto.status !== undefined ? { status: dto.status as OrderStatus } : {}),
        ...(dto.paymentType !== undefined
          ? { paymentType: dto.paymentType as OrderPaymentType }
          : {}),
        ...(dto.amount !== undefined ? { amount: Math.round(Number(dto.amount)) } : {}),
      },
      include: { product: true },
    });

    // If the order status was updated, notify the buyer with the new status
    if (dto.status) {
      const productTitle = (updated.product as any)?.title || "Product";

      this.notificationsService.createAndNotify(
        updated.buyerId,
        "order_status_updated",
        "ORDER",
        {
          orderId: updated.id, // This is our mandatory generic payload
          status: dto.status,
          productId: updated.productId, // Optional additional payload
          actionType: updated.status,
        },
        {
          productTitle: productTitle,
          status: dto.status,
        },
      );
    }

    return {
      message: this.i18n.translate("auth.orders.updated_success", { lang: this.lang }),
      data: this.toApiShape(updated),
    };
  }

  // DELETE
  async deleteOrder(orderId: string): Promise<void> {
    if (!isObjectIdLike(orderId))
      throw new BadRequestException(
        this.i18n.translate("auth.orders.invalid_order_id", { lang: this.lang }),
      );

    const result = await this.prisma.order.deleteMany({ where: { id: orderId } });
    if (result.count === 0)
      throw new NotFoundException(
        this.i18n.translate("auth.orders.order_not_found", { lang: this.lang }),
      );
  }
}
