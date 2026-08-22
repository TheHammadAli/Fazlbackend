import { OnGatewayConnection, OnGatewayDisconnect, OnGatewayInit } from "@nestjs/websockets";
import { Server, Socket } from "socket.io";
import { ChatService } from "./chat.service";
export declare class ChatGateway implements OnGatewayConnection, OnGatewayDisconnect, OnGatewayInit {
    private readonly chatService;
    server: Server;
    static serverInstance: Server;
    afterInit(server: Server): void;
    private logger;
    constructor(chatService: ChatService);
    handleConnection(client: Socket): void;
    handleDisconnect(client: Socket): void;
    handleJoinRoom(data: {
        conversationId: string;
    }, client: Socket): Promise<void>;
    handleSendMessage(data: {
        conversationId: string;
        senderId: string;
        receiverId: string;
        text: string;
    }, client: Socket): Promise<{
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
    handleStartConversation(data: {
        buyerId: string;
        sellerId: string;
    }, client: Socket): Promise<void>;
    handleMarkAsRead(data: {
        conversationId: string;
        userId: string;
    }): Promise<void>;
}
