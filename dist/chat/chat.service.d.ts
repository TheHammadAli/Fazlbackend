import { Model } from "mongoose";
import { I18nService } from "nestjs-i18n";
import { Conversation } from "./schema/conversation.schema";
import { Message } from "./schema/message.schema";
import { PaginationDto } from "src/common/dto/pagination.dto";
import { PaginatedResponseDto } from "src/common/dto/pagination-response.dto";
import { UsersService } from "src/users/users.service";
import { ShopService } from "src/shop/shop.service";
import { ClsService } from "nestjs-cls";
import { NotificationsService } from "src/notifications/notifications.service";
import { ChatGateway } from "./chat.gateway";
export declare class ChatService {
    private readonly conversationModel;
    private readonly messageModel;
    private readonly userService;
    private readonly shopService;
    private readonly i18n;
    private readonly cls;
    private readonly notificationsService;
    private readonly chatGateway;
    constructor(conversationModel: Model<Conversation>, messageModel: Model<Message>, userService: UsersService, shopService: ShopService, i18n: I18nService, cls: ClsService, notificationsService: NotificationsService, chatGateway: ChatGateway);
    private get lang();
    getOrCreateConversation(buyerId: string, sellerId: string): Promise<import("mongoose").Document<unknown, {}, Conversation, {}> & Conversation & Required<{
        _id: unknown;
    }> & {
        __v: number;
    }>;
    findConversationBetween(userIdA: string, userIdB: string): Promise<(import("mongoose").Document<unknown, {}, Conversation, {}> & Conversation & Required<{
        _id: unknown;
    }> & {
        __v: number;
    }) | null>;
    sendMessage(conversationId: string, senderId: string, receiverId: string, text: string, imageUrl?: string): Promise<{
        data: {
            message: import("mongoose").Document<unknown, {}, Message, {}> & Message & Required<{
                _id: unknown;
            }> & {
                __v: number;
            };
            sender: import("../users/schema/users.schema").User & import("mongoose").Document<unknown, any, any, Record<string, any>>;
            conversation: import("mongoose").Document<unknown, {}, Conversation, {}> & Conversation & Required<{
                _id: unknown;
            }> & {
                __v: number;
            };
        };
    }>;
    getMessages(conversationId: string, paginationDto: PaginationDto): Promise<PaginatedResponseDto<Message>>;
    markAsRead(conversationId: string, userId: string): Promise<{
        success: boolean;
    }>;
    getUnreadConversations(userId: string): Promise<any[]>;
    getConversationsByUserId(userId: string, paginationDto: PaginationDto): Promise<PaginatedResponseDto<Conversation>>;
    countConversationsForUser(userId: string): Promise<number>;
    countMessagesSentByUser(userId: string): Promise<number>;
    countMessagesReceivedByUser(userId: string): Promise<number>;
}
