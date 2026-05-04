import { Model, Types } from "mongoose";
import { I18nService } from "nestjs-i18n";
import { Broadcast } from "./schema/broadcast.schema";
import { BroadcastMessage } from "./schema/broadcast-message.schema";
import { BroadcastThread } from "./schema/broadcast-thread.schema";
import { CreateBroadcastDto } from "./dto/create-broadcast.dto";
import { PaginatedResponseDto } from "src/common/dto/pagination-response.dto";
import { ShopService } from "../shop/shop.service";
import { UsersService } from "src/users/users.service";
import { CategoryService } from "src/category/category.service";
import { ServicesService } from "src/services/services.service";
import { ClsService } from "nestjs-cls";
export declare class BroadcastService {
    private readonly broadcastModel;
    private readonly messageModel;
    private readonly threadModel;
    private readonly shopService;
    private readonly categoryService;
    private readonly userService;
    private readonly servicesService;
    private readonly i18n;
    private readonly cls;
    constructor(broadcastModel: Model<Broadcast>, messageModel: Model<BroadcastMessage>, threadModel: Model<BroadcastThread>, shopService: ShopService, categoryService: CategoryService, userService: UsersService, servicesService: ServicesService, i18n: I18nService, cls: ClsService);
    private get lang();
    private createBroadcast;
    private findNearbySellers;
    private findNearbyServiceProviders;
    private findCategorybyId;
    private createBroadcastThreads;
    createBroadcastAndDispatch(dto: CreateBroadcastDto, buyerId: string, location: {
        type: string;
        coordinates: [number, number];
    }, imageUrl?: string): Promise<{
        message: string;
        data: string;
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
    getBroadcastThreads(broadcastId: string): Promise<any[]>;
    getThreadMessages(threadId: string): Promise<(import("mongoose").Document<unknown, {}, BroadcastMessage, {}> & BroadcastMessage & {
        _id: Types.ObjectId;
    } & {
        __v: number;
    })[]>;
    getBroadcastsByBuyer(userId: string, page?: number, limit?: number): Promise<PaginatedResponseDto<Broadcast>>;
    getBroadcastsForSeller(userId: string, page?: number, limit?: number): Promise<PaginatedResponseDto<any>>;
}
