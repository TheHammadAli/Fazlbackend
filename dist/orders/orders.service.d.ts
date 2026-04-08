import { Model } from 'mongoose';
import { Order, OrderDocument } from './schema/order.schema';
import { CreateOrderDto } from './dto/create-order-dto';
import { UpdateOrderDto } from './dto/update-order-dto';
import { UsersService } from 'src/users/users.service';
import { ProductsService } from 'src/products/products.service';
import { ShopService } from 'src/shop/shop.service';
import { NotificationsService } from 'src/notifications/notifications.service';
export declare class OrdersService {
    private readonly orderModel;
    private readonly usersService;
    private readonly productsService;
    private readonly shopService;
    private readonly notificationsService;
    constructor(orderModel: Model<OrderDocument>, usersService: UsersService, productsService: ProductsService, shopService: ShopService, notificationsService: NotificationsService);
    createOrder(dto: CreateOrderDto): Promise<Order>;
    getOrderById(orderId: string): Promise<Order>;
    getOrdersByOwner(ownerId: string, ownerModel: 'Shop' | 'User', page?: number, limit?: number): Promise<{
        data: Order[];
        total: number;
        page: number;
        limit: number;
        totalPages: number;
    }>;
    getOrdersByBuyer(buyerId: string, page?: number, limit?: number): Promise<{
        data: Order[];
        total: number;
        page: number;
        limit: number;
        totalPages: number;
    }>;
    updateOrder(orderId: string, dto: UpdateOrderDto): Promise<Order>;
    deleteOrder(orderId: string): Promise<void>;
}
