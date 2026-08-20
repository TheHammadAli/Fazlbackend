import { Model, Types } from "mongoose";
import { I18nService } from "nestjs-i18n";
import { Broadcast } from "./schema/broadcast.schema";
import { BroadcastMessage } from "./schema/broadcast-message.schema";
import { BroadcastThread } from "./schema/broadcast-thread.schema";
import { CounterDocument } from "src/common/schema/counter.schema";
import { CreateBroadcastDto } from "./dto/create-broadcast.dto";
import { PaginatedResponseDto } from "src/common/dto/pagination-response.dto";
import { PaginationDto } from "src/common/dto/pagination.dto";
import { ShopService } from "../shop/shop.service";
import { UsersService } from "src/users/users.service";
import { CategoryService } from "src/category/category.service";
import { ServicesService } from "src/services/services.service";
import { ProductsService } from "src/products/products.service";
import { NotificationsService } from "src/notifications/notifications.service";
import { ClsService } from "nestjs-cls";
import { BroadcastGateway } from "./broadcast.gateway";
export declare class BroadcastService {
    private readonly broadcastModel;
    private readonly messageModel;
    private readonly threadModel;
    private readonly counterModel;
    private readonly shopService;
    private readonly categoryService;
    private readonly userService;
    private readonly servicesService;
    private readonly productsService;
    private readonly notificationsService;
    private readonly i18n;
    private readonly cls;
    private readonly broadcastGateway;
    constructor(broadcastModel: Model<Broadcast>, messageModel: Model<BroadcastMessage>, threadModel: Model<BroadcastThread>, counterModel: Model<CounterDocument>, shopService: ShopService, categoryService: CategoryService, userService: UsersService, servicesService: ServicesService, productsService: ProductsService, notificationsService: NotificationsService, i18n: I18nService, cls: ClsService, broadcastGateway: BroadcastGateway);
    private get lang();
    private generateNextBroadcastCode;
    private createBroadcast;
    private findNearbySellers;
    private findNearbyServiceProviders;
    private findCategorybyId;
    private createBroadcastThreads;
    createBroadcastAndDispatch(dto: CreateBroadcastDto, buyerId: string, location: {
        type: string;
        coordinates: [number, number];
    }, imageUrls?: string[]): Promise<{
        message: string;
        data: {
            id: string;
        };
    }>;
    sendBroadcastMessage(broadcastId: string, senderId: string, receiverId: string, threadId: string, message: string, imageUrl?: string): Promise<{
        data: {
            message: import("mongoose").Document<unknown, {}, BroadcastMessage, {}> & BroadcastMessage & {
                _id: Types.ObjectId;
            } & {
                __v: number;
            };
            sender: import("../users/schema/users.schema").User & import("mongoose").Document<unknown, any, any, Record<string, any>>;
            thread: {
                id: string;
                buyer: Types.ObjectId;
                seller: Types.ObjectId;
                broadcast: Types.ObjectId;
            };
        };
    }>;
    markThreadMessagesAsRead(threadId: string, userId: string): Promise<{
        success: boolean;
    }>;
    getBroadcastThreads(broadcastId: string, currentUserId?: string): Promise<any[]>;
    getThreadMessages(threadId: string, userId?: string): Promise<(import("mongoose").Document<unknown, {}, BroadcastMessage, {}> & BroadcastMessage & {
        _id: Types.ObjectId;
    } & {
        __v: number;
    })[]>;
    getBroadcastsByBuyer(userId: string, page?: number, limit?: number): Promise<{
        meta: {
            total: number;
            page: number;
            limit: number;
            totalPages: number;
        };
        data: any[];
    }>;
    getBroadcastsForSeller(userId: string, page?: number, limit?: number): Promise<PaginatedResponseDto<any>>;
    getAllBroadcastsForAdmin(page?: number, limit?: number, search?: string, status?: string, startDate?: string, endDate?: string): Promise<PaginatedResponseDto<any>>;
    getBroadcastDetailForAdmin(broadcastId: string): Promise<{
        data: {
            sentTo: number;
            repliedSellers: number;
            imageUrls: string[];
            broadcastCode?: string | undefined;
            buyer: Types.ObjectId;
            message: string;
            address?: string | undefined;
            purpose: "Buying" | "Selling";
            category: Types.ObjectId;
            radius: number;
            location: import("mongoose").FlattenMaps<{
                type: "Point";
                coordinates: [number, number];
            }>;
            type: "product" | "service";
            expiresAt: Date;
            lastResponseAt: Date;
            status: "open" | "closed";
            isDeleted: boolean;
            _id: Types.ObjectId;
            __v: number;
        };
    }>;
    getBroadcastRecipients(broadcastId: string): Promise<{
        data: any[];
        meta: {
            total: number;
        };
    }>;
    getAdminThreadMessages(broadcastId: string, sellerId: string, paginationDto: PaginationDto): Promise<{
        thread: null;
        messages: never[];
        meta: {
            total: number;
            page: number;
            limit: number;
            totalPages: number;
        };
    } | {
        thread: {
            _id: unknown;
        };
        messages: (import("mongoose").Document<unknown, {}, BroadcastMessage, {}> & BroadcastMessage & {
            _id: Types.ObjectId;
        } & {
            __v: number;
        })[];
        meta: {
            total: number;
            page: number;
            limit: number;
            totalPages: number;
        };
    }>;
    closeBroadcast(broadcastId: string): Promise<{
        message: string;
        data: import("mongoose").Document<unknown, {}, Broadcast, {}> & Broadcast & {
            _id: Types.ObjectId;
        } & {
            __v: number;
        };
    }>;
    deleteBroadcast(broadcastId: string): Promise<{
        message: string;
        data: import("mongoose").Document<unknown, {}, Broadcast, {}> & Broadcast & {
            _id: Types.ObjectId;
        } & {
            __v: number;
        };
    }>;
}
