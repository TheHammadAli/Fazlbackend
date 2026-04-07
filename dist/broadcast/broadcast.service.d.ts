import { Model, Types } from 'mongoose';
import { Broadcast } from './schema/broadcast.schema';
import { BroadcastMessage } from './schema/broadcast-message.schema';
import { BroadcastThread } from './schema/broadcast-thread.schema';
import { CreateBroadcastDto } from './dto/create-broadcast.dto';
import { ShopService } from '../shop/shop.service';
import { UsersService } from 'src/users/users.service';
import { CategoryService } from 'src/category/category.service';
export declare class BroadcastService {
    private readonly broadcastModel;
    private readonly messageModel;
    private readonly threadModel;
    private readonly shopService;
    private readonly categoryService;
    private readonly userService;
    constructor(broadcastModel: Model<Broadcast>, messageModel: Model<BroadcastMessage>, threadModel: Model<BroadcastThread>, shopService: ShopService, categoryService: CategoryService, userService: UsersService);
    private createBroadcast;
    private findNearbySellers;
    private findCategorybyId;
    private createBroadcastThreads;
    createBroadcastAndDispatch(dto: CreateBroadcastDto, buyerId: string, location: {
        type: string;
        coordinates: [number, number];
    }): Promise<{
        message: string;
        data: string;
    }>;
    sendBroadcastMessage(broadcastId: string, senderId: string, receiverId: string, threadId: string, message: string): Promise<import("mongoose").Document<unknown, {}, BroadcastMessage, {}> & BroadcastMessage & {
        _id: Types.ObjectId;
    } & {
        __v: number;
    }>;
    getBroadcastThreads(broadcastId: string): Promise<(import("mongoose").Document<unknown, {}, BroadcastThread, {}> & BroadcastThread & Required<{
        _id: unknown;
    }> & {
        __v: number;
    })[]>;
    getThreadMessages(threadId: string): Promise<(import("mongoose").Document<unknown, {}, BroadcastMessage, {}> & BroadcastMessage & {
        _id: Types.ObjectId;
    } & {
        __v: number;
    })[]>;
}
