import { ChatService } from "./chat.service";
import { PaginationDto } from "src/common/dto/pagination.dto";
import { CreateMessageDto } from "./dto/create-message.dto";
export declare class ChatController {
    private readonly chatService;
    constructor(chatService: ChatService);
    getOrCreateConversation(body: {
        buyerId: string;
        sellerId: string;
    }): Promise<import("mongoose").Document<unknown, {}, import("./schema/conversation.schema").Conversation, {}> & import("./schema/conversation.schema").Conversation & Required<{
        _id: unknown;
    }> & {
        __v: number;
    }>;
    sendMessage(body: CreateMessageDto): Promise<import("mongoose").Document<unknown, {}, import("./schema/message.schema").Message, {}> & import("./schema/message.schema").Message & Required<{
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
    broadcast(body: {
        buyerId: string;
        coordinates: [number, number];
        radius: number;
        text: string;
    }): Promise<{
        message: string;
        count: number;
        data?: undefined;
    } | {
        message: string;
        data: {
            totalTargets: number;
            successfulMessages: number;
            failedMessages: number;
            detailedResults: PromiseSettledResult<(import("mongoose").Document<unknown, {}, import("./schema/message.schema").Message, {}> & import("./schema/message.schema").Message & Required<{
                _id: unknown;
            }> & {
                __v: number;
            }) | null>[];
        };
        count?: undefined;
    }>;
}
