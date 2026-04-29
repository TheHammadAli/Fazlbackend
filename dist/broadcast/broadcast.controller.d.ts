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
    createBroadcast(dto: CreateBroadcastDto, req: Request, file?: Express.Multer.File): Promise<{
        message: string;
        data: string;
    }>;
    sendMessage(broadcastId: string, dto: SendBroadcastMessageDto, req: Request, file?: Express.Multer.File): Promise<import("mongoose").Document<unknown, {}, import("./schema/broadcast-message.schema").BroadcastMessage, {}> & import("./schema/broadcast-message.schema").BroadcastMessage & {
        _id: import("mongoose").Types.ObjectId;
    } & {
        __v: number;
    }>;
    getThreads(broadcastId: string): Promise<any[]>;
    getThreadMessages(broadcastId: string, threadId: string): Promise<(import("mongoose").Document<unknown, {}, import("./schema/broadcast-message.schema").BroadcastMessage, {}> & import("./schema/broadcast-message.schema").BroadcastMessage & {
        _id: import("mongoose").Types.ObjectId;
    } & {
        __v: number;
    })[]>;
    getMyBroadcasts(req: Request, paginationDto: PaginationDto): Promise<import("../common/dto/pagination-response.dto").PaginatedResponseDto<import("./schema/broadcast.schema").Broadcast>>;
    getReceivedBroadcasts(req: Request, paginationDto: PaginationDto): Promise<import("../common/dto/pagination-response.dto").PaginatedResponseDto<any>>;
}
