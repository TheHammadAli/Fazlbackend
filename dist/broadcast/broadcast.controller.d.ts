import { Request } from "express";
import { BroadcastService } from "./broadcast.service";
import { CreateBroadcastDto } from "./dto/create-broadcast.dto";
import { SendBroadcastMessageDto } from "./dto/send-broadcast.dto";
import { PaginationDto } from "src/common/dto/pagination.dto";
import { JwtPayload } from "src/auth/strategies/jwt-strategy";
import { ActivityLogService } from "src/activity-log/activity-log.service";
import { FileUploadService } from "src/common/file-upload/file-upload.service";
export declare class BroadcastController {
    private readonly broadcastService;
    private readonly fileUploadService;
    private readonly activityLogService;
    constructor(broadcastService: BroadcastService, fileUploadService: FileUploadService, activityLogService: ActivityLogService);
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
    getThreads(broadcastId: string, req: Request): Promise<any[]>;
    getThreadMessages(broadcastId: string, threadId: string, req: Request): Promise<(import("mongoose").Document<unknown, {}, import("./schema/broadcast-message.schema").BroadcastMessage, {}> & import("./schema/broadcast-message.schema").BroadcastMessage & {
        _id: import("mongoose").Types.ObjectId;
    } & {
        __v: number;
    })[]>;
    markThreadAsRead(broadcastId: string, threadId: string, req: Request): Promise<{
        success: boolean;
    }>;
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
    getAllBroadcastsForAdmin(page?: number, limit?: number, search?: string, status?: string, startDate?: string, endDate?: string): Promise<import("../common/dto/pagination-response.dto").PaginatedResponseDto<any>>;
    getBroadcastDetail(broadcastId: string): Promise<{
        data: {
            sentTo: number;
            repliedSellers: number;
            imageUrls: string[];
            broadcastCode?: string | undefined;
            buyer: import("mongoose").Types.ObjectId;
            message: string;
            address?: string | undefined;
            purpose: "Buying" | "Selling";
            category: import("mongoose").Types.ObjectId;
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
            _id: import("mongoose").Types.ObjectId;
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
        messages: (import("mongoose").Document<unknown, {}, import("./schema/broadcast-message.schema").BroadcastMessage, {}> & import("./schema/broadcast-message.schema").BroadcastMessage & {
            _id: import("mongoose").Types.ObjectId;
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
        data: import("mongoose").Document<unknown, {}, import("./schema/broadcast.schema").Broadcast, {}> & import("./schema/broadcast.schema").Broadcast & {
            _id: import("mongoose").Types.ObjectId;
        } & {
            __v: number;
        };
    }>;
    deleteBroadcast(broadcastId: string, currentUser: JwtPayload, req: Request): Promise<{
        message: string;
        data: import("mongoose").Document<unknown, {}, import("./schema/broadcast.schema").Broadcast, {}> & import("./schema/broadcast.schema").Broadcast & {
            _id: import("mongoose").Types.ObjectId;
        } & {
            __v: number;
        };
    }>;
}
