import { ChatService } from "./chat.service";
import { PaginationDto } from "src/common/dto/pagination.dto";
import { CreateMessageDto } from "./dto/create-message.dto";
import { FileUploadService } from "src/common/file-upload/file-upload.service";
import { Request } from "express";
export declare class ChatController {
    private readonly chatService;
    private readonly fileUploadService;
    constructor(chatService: ChatService, fileUploadService: FileUploadService);
    getOrCreateConversation(body: {
        buyerId: string;
        sellerId: string;
    }): Promise<import("mongoose").Document<unknown, {}, import("./schema/conversation.schema").Conversation, {}> & import("./schema/conversation.schema").Conversation & Required<{
        _id: unknown;
    }> & {
        __v: number;
    }>;
    sendMessage(body: CreateMessageDto, file?: Express.Multer.File): Promise<{
        data: {
            message: import("mongoose").Document<unknown, {}, import("./schema/message.schema").Message, {}> & import("./schema/message.schema").Message & Required<{
                _id: unknown;
            }> & {
                __v: number;
            };
            sender: import("../users/schema/users.schema").User & import("mongoose").Document<unknown, any, any, Record<string, any>>;
            conversation: import("mongoose").Document<unknown, {}, import("./schema/conversation.schema").Conversation, {}> & import("./schema/conversation.schema").Conversation & Required<{
                _id: unknown;
            }> & {
                __v: number;
            };
        };
    }>;
    getMessages(conversationId: string, paginationDto: PaginationDto): Promise<import("../common/dto/pagination-response.dto").PaginatedResponseDto<import("./schema/message.schema").Message>>;
    markConversationAsRead(conversationId: string, req: Request): Promise<{
        success: boolean;
    }>;
    markAsRead(body: {
        conversationId: string;
        userId: string;
    }): Promise<{
        success: boolean;
    }>;
    getUnreadCount(userId: string): Promise<any[]>;
    getConversationsByUserId(userId: string, paginationDto: PaginationDto): Promise<import("../common/dto/pagination-response.dto").PaginatedResponseDto<import("./schema/conversation.schema").Conversation>>;
}
