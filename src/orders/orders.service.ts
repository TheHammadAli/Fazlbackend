import {
  Injectable,
  NotFoundException,
  BadRequestException,
  Inject,
  forwardRef,
} from "@nestjs/common";
import { InjectModel } from "@nestjs/mongoose";
import { FilterQuery, Model, Types } from "mongoose";
import { I18nService } from "nestjs-i18n";
import { Order, OrderDocument } from "./schema/order.schema";
import { CreateOrderDto } from "./dto/create-order-dto";
import { UpdateOrderDto } from "./dto/update-order-dto";
import { UsersService } from "src/users/users.service";
import { ProductsService } from "src/products/products.service";
import { ShopService } from "src/shop/shop.service";
import { NotificationsService } from "src/notifications/notifications.service";
import { ClsService } from "nestjs-cls";

@Injectable()
export class OrdersService {
  constructor(
    @InjectModel(Order.name)
    private readonly orderModel: Model<OrderDocument>,
    private readonly usersService: UsersService,
    @Inject(forwardRef(() => ProductsService))
    private readonly productsService: ProductsService,
    @Inject(forwardRef(() => ShopService))
    private readonly shopService: ShopService,
    @Inject(forwardRef(() => NotificationsService))
    private readonly notificationsService: NotificationsService,
    private readonly i18n: I18nService,
    private readonly cls: ClsService,
  ) { }

  /** Dynamic getter for the current request language */
  private get lang(): string {
    return this.cls.get("lang") || "en";
  }


  async createMultipleOrders(dto: CreateOrderDto[]) {
    const createdOrders: any[] = [];
    const results = Promise.all(
      dto.map(async (orderDto) => {
        try {
          createdOrders.push(this.createOrder(orderDto));
        } catch (error) {
          // Log the error and continue with the next order
          console.error(`Failed to create order for product ${orderDto.product}:`, error);
        }
      }),
    );

    const promiseResults = await results;
    console.log("Bulk order creation results:", promiseResults);

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
        this.i18n.translate("auth.orders.product_not_found", {
          lang: this.lang,
        }),
      );

    let ownerExists = false;
    let owner: any = null;

    if (dto.ownerModel === "Shop") {
      owner = await this.shopService.getShopById(dto.owner);
      ownerExists = !!owner;
    } else if (dto.ownerModel === "User") {
      owner = await this.usersService.findUserById(dto.owner);
      ownerExists = !!owner;
    }


    if (!ownerExists)
      throw new NotFoundException(
        this.i18n.translate("auth.orders.order_owner_not_found", {
          lang: this.lang,
        }),
      );

    console.log("Owner found:", owner, dto.owner, product); // Debug log
    let isValidOwner = false;
    if (dto.ownerModel === "Shop") {
      isValidOwner = dto.owner === product.shopId._id.toString();
    } else if (dto.ownerModel === "User") {
      isValidOwner = dto.owner === product.ownerId?._id?.toString();
    }

    if (!isValidOwner) {
      throw new BadRequestException(
        this.i18n.translate("auth.orders.order_mismatch", { lang: this.lang }),
      );
    }

    // 2. Prepare and Save
    const order = new this.orderModel({
      ...dto,
      buyer: new Types.ObjectId(dto.buyer),
      owner: new Types.ObjectId(dto.owner),
      product: new Types.ObjectId(dto.product),
    });

    const savedOrder = await order.save();

    // 3. Post-Save Notifications with Generic Payload
    const notificationPayload = {
      orderId: (savedOrder as any)._id.toString(),
      productId: dto.product,
      ownerModel: dto.ownerModel,
    };

    console.log("Product.Ownerid", product.ownerId);

    // Notify buyer (using translation placeholders)
    this.notificationsService.createAndNotify(
      dto.buyer,
      "order_created_buyer",
      "ORDER",
      notificationPayload,
      { productTitle: product.title },
    );
    console.log("Owner for notification:", owner); // Debug log
    // Notify owner/seller
    this.notificationsService.createAndNotify(
      dto.ownerModel === "Shop"
        ? owner.ownerId._id?.toString()
        : owner._id?.toString() || dto.owner,
      "order_created_seller",
      "ORDER",
      notificationPayload,
      { productTitle: product.title },
    );

    return { message: this.i18n.translate("auth.orders.created_success", { lang: this.lang }), data: savedOrder };
  }

  // READ: Get by ID
  async getOrderById(orderId: string): Promise<Order> {
    if (!Types.ObjectId.isValid(orderId))
      throw new BadRequestException(
        this.i18n.translate("auth.orders.invalid_order_id", {
          lang: this.lang,
        }),
      );

    const order = await this.orderModel
      .findById(orderId)
      .populate("buyer")
      .populate("product")
      .populate("owner")
      .exec();

    if (!order)
      throw new NotFoundException(
        this.i18n.translate("auth.orders.order_not_found", { lang: this.lang }),
      );
    return order;
  }

  // READ: List by Owner
  async getOrdersByOwner(
    ownerId: string,
    ownerModel: "Shop" | "User",
    page = 1,
    limit = 10,
    status?: string
  ): Promise<{
    data: Order[];
    meta: {

      total: number;
      page: number;
      limit: number;
      totalPages: number;
    }
  }> {
    if (!Types.ObjectId.isValid(ownerId))
      throw new BadRequestException(
        this.i18n.translate("auth.orders.invalid_owner_id", {
          lang: this.lang,
        }),
      );

    if (page < 1 || limit < 1)
      throw new BadRequestException(
        this.i18n.translate("auth.orders.invalid_page_limit", {
          lang: this.lang,
        }),
      );

    const skip = (page - 1) * limit;

    const filter: FilterQuery<OrderDocument> = {
      owner: new Types.ObjectId(ownerId),
      ownerModel,
    };

    if (status) {
      filter.status = status as any; // Cast to any to bypass strict typing, ensure status is valid in real implementation
    }

    const [data, total] = await Promise.all([
      this.orderModel
        .find(filter)
        .populate("product")
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .exec(),
      this.orderModel.countDocuments(filter),

    ]);

    console.log("Data, Total, Filter", { data, total, filter }); // Debug log
    return {
      data,
      meta: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit)
      }
    };
  }

  // READ: List by Buyer
  async getOrdersByBuyer(
    buyerId: string,
    page = 1,
    limit = 10,
    status?: string,
  ): Promise<{
    data: Order[];
    meta: {
      total: number;
      page: number;
      limit: number;
      totalPages: number;
    }
  }> {


    if (!Types.ObjectId.isValid(buyerId))
      throw new BadRequestException(
        this.i18n.translate("auth.orders.invalid_buyer_id", {
          lang: this.lang,
        }),
      );

    const filter: FilterQuery<OrderDocument> = {
      buyer: new Types.ObjectId(buyerId),
    };

    if (status) {
      filter.status = status as any; // Cast to any to bypass strict typing, ensure status is valid in real implementation
    }
    const skip = (page - 1) * limit;
    const [data, total] = await Promise.all([
      this.orderModel
        .find(filter)
        .populate("product")
        .populate("owner")
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .exec(),
      this.orderModel.countDocuments(filter),
    ]);
    return {
      data,
      meta: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit)
      }
    }
  }

  // UPDATE: Logic updated to notify on status changes
  async updateOrder(orderId: string, dto: UpdateOrderDto): Promise<Order> {
    if (!Types.ObjectId.isValid(orderId))
      throw new BadRequestException(
        this.i18n.translate("auth.orders.invalid_order_id", {
          lang: this.lang,
        }),
      );

    const updated = await this.orderModel
      .findByIdAndUpdate(orderId, dto, { new: true })
      .populate("product");

    if (!updated)
      throw new NotFoundException(
        this.i18n.translate("auth.orders.order_not_found", { lang: this.lang }),
      );

    // If the order status was updated, notify the buyer with the new status
    if (dto.status) {
      // 1. Safely extract the ID as a string
      const orderId =
        updated._id instanceof Types.ObjectId
          ? updated._id.toHexString()
          : String(updated._id);

      // 2. Safely extract the product title
      // Since you populated 'product', we cast to any to access the title property
      const productTitle = (updated.product as any)?.title || "Product";

      // 3. Dispatch
      this.notificationsService.createAndNotify(
        updated.buyer.toString(),
        "order_status_updated",
        "ORDER",
        {
          orderId: orderId, // This is our mandatory generic payload
          status: dto.status,
        },
        {
          productTitle: productTitle,
          status: dto.status,
        },
      );
    }

    return updated;
  }

  // DELETE
  async deleteOrder(orderId: string): Promise<void> {
    if (!Types.ObjectId.isValid(orderId))
      throw new BadRequestException(
        this.i18n.translate("auth.orders.invalid_order_id", {
          lang: this.lang,
        }),
      );

    const result = await this.orderModel.findByIdAndDelete(orderId);
    if (!result)
      throw new NotFoundException(
        this.i18n.translate("auth.orders.order_not_found", { lang: this.lang }),
      );
  }
}
