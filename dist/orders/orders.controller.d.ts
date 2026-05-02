import { OrdersService } from "./orders.service";
import { CreateOrderDto } from "./dto/create-order-dto";
import { UpdateOrderDto } from "./dto/update-order-dto";
import { Order } from "./schema/order.schema";
import { PaginationDto } from "src/common/dto/pagination.dto";
export declare class OrdersController {
    private readonly ordersService;
    constructor(ordersService: OrdersService);
    createOrder(dto: CreateOrderDto): Promise<Order>;
    getOrderById(id: string): Promise<Order>;
    getOrdersByOwner(ownerId: string, ownerModel: "Shop" | "User", pagination: PaginationDto): Promise<{
        data: Order[];
        total: number;
        page: number;
        limit: number;
        totalPages: number;
    }>;
    getOrdersByBuyer(buyerId: string, pagination: PaginationDto): Promise<{
        data: Order[];
        total: number;
        page: number;
        limit: number;
        totalPages: number;
    }>;
    updateOrder(id: string, dto: UpdateOrderDto): Promise<Order>;
    deleteOrder(id: string): Promise<void>;
}
