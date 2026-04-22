import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from "@nestjs/common";
import { InjectModel } from "@nestjs/mongoose";
import { Model, Types } from "mongoose";
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
    private readonly productsService: ProductsService,
    private readonly shopService: ShopService,
    private readonly notificationsService: NotificationsService,
    private readonly i18n: I18nService,
    private readonly cls: ClsService,
  ) {}

  /** Dynamic getter for the current request language */
  private get lang(): string {
    return this.cls.get("lang") || "en";
  }

  // Create (Insert)
  async createOrder(dto: CreateOrderDto): Promise<Order> {
    // Check if buyer exists
    const buyer = await this.usersService.findUserById(dto.buyer);
    if (!buyer)
      throw new NotFoundException(
        this.i18n.translate("orders.buyer_not_found", { lang: this.lang }),
      );

    // Check if product exists
    const product = await this.productsService.getById(dto.product, this.lang);
    if (!product)
      throw new NotFoundException(
        this.i18n.translate("orders.product_not_found", { lang: this.lang }),
      );

    // Check if owner exists (shop or user)
    let ownerExists = false;
    if (dto.ownerModel === "Shop") {
      ownerExists = !!(await this.shopService.getShopById(dto.owner, this.lang));
    } else if (dto.ownerModel === "User") {
      ownerExists = !!(await this.usersService.findUserById(dto.owner));
    }
    
    if (!ownerExists)
      throw new NotFoundException(
        this.i18n.translate("orders.order_owner_not_found", { lang: this.lang }),
      );

    let isValidOwner = false;
    if (dto.ownerModel === "Shop") {
      isValidOwner = dto.owner === product.shopId.toString();
    } else if (dto.ownerModel === "User") {
      isValidOwner = dto.owner === product.ownerId?.toString();
    }

    if (!isValidOwner) {
      throw new BadRequestException(
        this.i18n.translate("orders.order_mismatch", { lang: this.lang }),
      );
    }

    const order = new this.orderModel({
      ...dto,
      buyer: new Types.ObjectId(dto.buyer),
      owner: new Types.ObjectId(dto.owner),
      product: new Types.ObjectId(dto.product),
    });

    // Notify buyer and owner
    this.notificationsService.createAndNotify(
      dto.buyer,
      "order_buyer", // The service logic we built earlier will prefix "notifications."
      "ORDER",
      { productTitle: product.title },
    );
    this.notificationsService.createAndNotify(
      dto.owner,
      "order_seller",
      "ORDER",
      { productTitle: product.title },
    );
    
    return order.save();
  }

  // Read (Get specific order by ID)
  async getOrderById(orderId: string): Promise<Order> {
    if (!Types.ObjectId.isValid(orderId))
      throw new BadRequestException(
        this.i18n.translate("orders.invalid_order_id", { lang: this.lang }),
      );

    const order = await this.orderModel
      .findById(orderId)
      .populate("buyer")
      .populate("product")
      .populate("owner")
      .exec();

    if (!order)
      throw new NotFoundException(
        this.i18n.translate("orders.order_not_found", { lang: this.lang }),
      );
    return order;
  }

  // Read (List orders, filter by owner)
  async getOrdersByOwner(
    ownerId: string,
    ownerModel: "Shop" | "User",
    page = 1,
    limit = 10,
  ): Promise<{
    data: Order[];
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  }> {
    if (!Types.ObjectId.isValid(ownerId))
      throw new BadRequestException(
        this.i18n.translate("orders.invalid_owner_id", { lang: this.lang })
      );
    
    if (page < 1 || limit < 1)
      throw new BadRequestException(
        this.i18n.translate("orders.invalid_page_limit", { lang: this.lang })
      );

    // Check owner existence
    if (ownerModel === "Shop") {
      const shop = await this.shopService.getShopById(ownerId);
      if (!shop) throw new NotFoundException(
        this.i18n.translate("orders.owner_not_found", { lang: this.lang })
      );
    } else if (ownerModel === "User") {
      const user = await this.usersService.findUserById(ownerId);
      if (!user) throw new NotFoundException(
        this.i18n.translate("orders.owner_not_found", { lang: this.lang })
      );
    } else {
      throw new BadRequestException(
        this.i18n.translate("orders.invalid_owner_model", { lang: this.lang })
      );
    }

    const skip = (page - 1) * limit;
    const [data, total] = await Promise.all([
      this.orderModel
        .find({ owner: new Types.ObjectId(ownerId), ownerModel })
        .populate("product")
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .exec(),
      this.orderModel.countDocuments({
        owner: new Types.ObjectId(ownerId),
        ownerModel,
      }),
    ]);
    return {
      data,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    };
  }

  // Read (List orders by buyer)
  async getOrdersByBuyer(
    buyerId: string,
    page = 1,
    limit = 10,
  ): Promise<{
    data: Order[];
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  }> {
    if (!Types.ObjectId.isValid(buyerId))
      throw new BadRequestException(
        this.i18n.translate("orders.invalid_buyer_id", { lang: this.lang })
      );

    if (page < 1 || limit < 1)
      throw new BadRequestException(
        this.i18n.translate("orders.invalid_page_limit", { lang: this.lang })
      );

    const buyer = await this.usersService.findUserById(buyerId);
    if (!buyer) throw new NotFoundException(
      this.i18n.translate("orders.buyer_not_found", { lang: this.lang })
    );

    const skip = (page - 1) * limit;
    const [data, total] = await Promise.all([
      this.orderModel
        .find({ buyer: new Types.ObjectId(buyerId) })
        .populate("product")
        .populate("owner")
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .exec(),
      this.orderModel.countDocuments({ buyer: new Types.ObjectId(buyerId) }),
    ]);
    return {
      data,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    };
  }

  // Update
  async updateOrder(orderId: string, dto: UpdateOrderDto): Promise<Order> {
    if (!Types.ObjectId.isValid(orderId))
      throw new BadRequestException(
        this.i18n.translate("orders.invalid_order_id", { lang: this.lang })
      );

    const updated = await this.orderModel.findByIdAndUpdate(orderId, dto, {
      new: true,
    });
    
    if (!updated) throw new NotFoundException(
      this.i18n.translate("orders.order_not_found", { lang: this.lang })
    );
    return updated;
  }

  // Delete
  async deleteOrder(orderId: string): Promise<void> {
    if (!Types.ObjectId.isValid(orderId))
      throw new BadRequestException(
        this.i18n.translate("orders.invalid_order_id", { lang: this.lang })
      );

    const result = await this.orderModel.findByIdAndDelete(orderId);
    if (!result) throw new NotFoundException(
      this.i18n.translate("orders.order_not_found", { lang: this.lang })
    );

    
  }
}