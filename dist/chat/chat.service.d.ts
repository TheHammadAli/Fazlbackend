import { Model } from "mongoose";
import { Conversation } from "./schema/conversation.schema";
import { Message } from "./schema/message.schema";
import { PaginationDto } from "src/common/dto/pagination.dto";
import { PaginatedResponseDto } from "src/common/dto/pagination-response.dto";
import { UsersService } from "src/users/users.service";
import { ShopService } from "src/shop/shop.service";
export declare class ChatService {
    private readonly conversationModel;
    private readonly messageModel;
    private readonly userService;
    private readonly shopService;
    constructor(conversationModel: Model<Conversation>, messageModel: Model<Message>, userService: UsersService, shopService: ShopService);
    getOrCreateConversation(buyerId: string, sellerId: string): Promise<(import("mongoose").Document<unknown, {}, Conversation, {}> & Conversation & Required<{
        _id: unknown;
    }> & {
        __v: number;
    }) | null>;
    sendMessage(conversationId: string, senderId: string, receiverId: string, text: string): Promise<import("mongoose").Document<unknown, {}, Message, {}> & Message & Required<{
        _id: unknown;
    }> & {
        __v: number;
    }>;
    getMessages(conversationId: string, paginationDto: PaginationDto): Promise<PaginatedResponseDto<Message>>;
    markAsRead(conversationId: string, userId: string): Promise<void>;
    getUnreadConversations(userId: string): Promise<any[]>;
    getConversationsByUserId(userId: string, paginationDto: PaginationDto): Promise<PaginatedResponseDto<Conversation>>;
    broadcastMessageToNearbySellers(buyerId: string, location: [number, number], radiusInKm: number, messageText: string): Promise<{
        message: string;
        count: number;
        data?: undefined;
    } | {
        message: string;
        data: {
            totalTargets: number;
            successfulMessages: number;
            failedMessages: number;
            detailedResults: PromiseSettledResult<(import("mongoose").Document<unknown, {}, Message, {}> & Message & Required<{
                _id: unknown;
            }> & {
                __v: number;
            }) | null>[];
        };
        count?: undefined;
    }>;
}
