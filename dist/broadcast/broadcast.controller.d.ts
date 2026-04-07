import { Request } from 'express';
import { BroadcastService } from './broadcast.service';
import { CreateBroadcastDto } from './dto/create-broadcast.dto';
import { SendBroadcastMessageDto } from './dto/send-broadcast.dto';
export declare class BroadcastController {
    private readonly broadcastService;
    constructor(broadcastService: BroadcastService);
    createBroadcast(dto: CreateBroadcastDto, req: Request): Promise<{
        message: string;
        data: string;
    }>;
    sendMessage(broadcastId: string, dto: SendBroadcastMessageDto, req: Request): Promise<import("mongoose").Document<unknown, {}, import("./schema/broadcast-message.schema").BroadcastMessage, {}> & import("./schema/broadcast-message.schema").BroadcastMessage & {
        _id: import("mongoose").Types.ObjectId;
    } & {
        __v: number;
    }>;
    getThreads(broadcastId: string): Promise<(import("mongoose").Document<unknown, {}, import("./schema/broadcast-thread.schema").BroadcastThread, {}> & import("./schema/broadcast-thread.schema").BroadcastThread & Required<{
        _id: unknown;
    }> & {
        __v: number;
    })[]>;
    getThreadMessages(broadcastId: string, threadId: string): Promise<(import("mongoose").Document<unknown, {}, import("./schema/broadcast-message.schema").BroadcastMessage, {}> & import("./schema/broadcast-message.schema").BroadcastMessage & {
        _id: import("mongoose").Types.ObjectId;
    } & {
        __v: number;
    })[]>;
    getMyBroadcasts(req: Request): Promise<(import("mongoose").Document<unknown, {}, import("./schema/broadcast.schema").Broadcast, {}> & import("./schema/broadcast.schema").Broadcast & {
        _id: import("mongoose").Types.ObjectId;
    } & {
        __v: number;
    })[]>;
    getReceivedBroadcasts(req: Request): Promise<(import("mongoose").Document<unknown, {}, import("./schema/broadcast.schema").Broadcast, {}> & import("./schema/broadcast.schema").Broadcast & {
        _id: import("mongoose").Types.ObjectId;
    } & {
        __v: number;
    })[]>;
}
