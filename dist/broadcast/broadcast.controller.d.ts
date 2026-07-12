import { Request } from "express";
import { BroadcastService } from "./broadcast.service";
import { CreateBroadcastDto } from "./dto/create-broadcast.dto";
import { SendBroadcastMessageDto } from "./dto/send-broadcast.dto";
import { PaginationDto } from "src/common/dto/pagination.dto";
import { FileUploadService } from "src/common/file-upload/file-upload.service";
export declare class BroadcastController {
    private readonly broadcastService;
    private readonly fileUploadService;
    constructor(broadcastService: BroadcastService, fileUploadService: FileUploadService);
    createBroadcast(dto: CreateBroadcastDto, req: Request, files?: Express.Multer.File[]): Promise<{
        message: string;
        data: {
            id: string;
        };
    }>;
    sendMessage(broadcastId: string, dto: SendBroadcastMessageDto, req: Request, file?: Express.Multer.File): Promise<{
        data: {
            message: import("mongoose").Document<unknown, {}, import("./schema/broadcast-message.schema").BroadcastMessage, {}> & import("./schema/broadcast-message.schema").BroadcastMessage & {
                _id: import("mongoose").Types.ObjectId;
            } & {
                __v: number;
            };
            sender: import("../users/schema/users.schema").User & import("mongoose").Document<unknown, any, any, Record<string, any>>;
            thread: {
                id: string;
                buyer: import("mongoose").Types.ObjectId;
                seller: import("mongoose").Types.ObjectId;
                broadcast: import("mongoose").Types.ObjectId;
            };
        };
    }>;
    getThreads(broadcastId: string): Promise<any[]>;
    getThreadMessages(broadcastId: string, threadId: string): Promise<(import("mongoose").Document<unknown, {}, import("./schema/broadcast-message.schema").BroadcastMessage, {}> & import("./schema/broadcast-message.schema").BroadcastMessage & {
        _id: import("mongoose").Types.ObjectId;
    } & {
        __v: number;
    })[]>;
    getMyBroadcasts(req: Request, paginationDto: PaginationDto): Promise<{
        meta: {
            total: number;
            page: number;
            limit: number;
            totalPages: number;
        };
        data: any[];
    }>;
    getReceivedBroadcasts(req: Request, paginationDto: PaginationDto): Promise<import("../common/dto/pagination-response.dto").PaginatedResponseDto<any>>;
}
