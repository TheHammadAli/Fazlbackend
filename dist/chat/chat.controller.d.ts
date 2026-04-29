import { ChatService } from "./chat.service";
import { PaginationDto } from "src/common/dto/pagination.dto";
import { CreateMessageDto } from "./dto/create-message.dto";
import { FileUploadService } from "src/common/file-upload/file-upload.service";
export declare class ChatController {
    private readonly chatService;
    private readonly fileUploadService;
    constructor(chatService: ChatService, fileUploadService: FileUploadService);
    getOrCreateConversation(body: {
        buyerId: string;
        sellerId: string;
    }): Promise<(import("mongoose").Document<unknown, {}, import("./schema/conversation.schema").Conversation, {}> & import("./schema/conversation.schema").Conversation & Required<{
        _id: unknown;
    }> & {
        __v: number;
    }) | null>;
    sendMessage(body: CreateMessageDto, file?: Express.Multer.File): Promise<import("mongoose").Document<unknown, {}, import("./schema/message.schema").Message, {}> & import("./schema/message.schema").Message & Required<{
        _id: unknown;
    }> & {
        __v: number;
    }>;
    getMessages(conversationId: string, paginationDto: PaginationDto): Promise<import("../common/dto/pagination-response.dto").PaginatedResponseDto<import("./schema/message.schema").Message>>;
    markAsRead(body: {
        conversationId: string;
        userId: string;
    }): Promise<void>;
    getUnreadCount(userId: string): Promise<any[]>;
    getConversationsByUserId(userId: string, paginationDto: PaginationDto): Promise<import("../common/dto/pagination-response.dto").PaginatedResponseDto<import("./schema/conversation.schema").Conversation>>;
}
