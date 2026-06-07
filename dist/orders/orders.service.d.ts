import { Model } from "mongoose";
import { I18nService } from "nestjs-i18n";
import { Order, OrderDocument } from "./schema/order.schema";
import { CreateOrderDto } from "./dto/create-order-dto";
import { UpdateOrderDto } from "./dto/update-order-dto";
import { UsersService } from "src/users/users.service";
import { ProductsService } from "src/products/products.service";
import { ShopService } from "src/shop/shop.service";
import { NotificationsService } from "src/notifications/notifications.service";
import { ClsService } from "nestjs-cls";
export declare class OrdersService {
    private readonly orderModel;
    private readonly usersService;
    private readonly productsService;
    private readonly shopService;
    private readonly notificationsService;
    private readonly i18n;
    private readonly cls;
    constructor(orderModel: Model<OrderDocument>, usersService: UsersService, productsService: ProductsService, shopService: ShopService, notificationsService: NotificationsService, i18n: I18nService, cls: ClsService);
    private readonly constants;
    private get lang();
    createMultipleOrders(dto: CreateOrderDto[]): Promise<{
        message: string;
        data: void[];
    }>;
    createOrder(dto: CreateOrderDto): Promise<{
        message: string;
        data: import("mongoose").Document<unknown, {}, OrderDocument, {}> & Order & import("mongoose").Document<unknown, any, any, Record<string, any>> & Required<{
            _id: unknown;
        }> & {
            __v: number;
        };
    }>;
    getOrderById(orderId: string): Promise<Order>;
    getOrdersByOwner(ownerId: string, ownerModel: "Shop" | "User", page?: number, limit?: number, status?: string): Promise<{
        data: Order[];
        meta: {
            total: number;
            page: number;
            limit: number;
            totalPages: number;
        };
    }>;
    getOrdersByBuyer(buyerId: string, page?: number, limit?: number, status?: string): Promise<{
        data: Order[];
        meta: {
            total: number;
            page: number;
            limit: number;
            totalPages: number;
        };
    }>;
    updateOrder(orderId: string, dto: UpdateOrderDto): Promise<Order>;
    deleteOrder(orderId: string): Promise<void>;
}
