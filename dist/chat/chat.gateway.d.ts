import { OnGatewayConnection, OnGatewayDisconnect } from "@nestjs/websockets";
import { Server, Socket } from "socket.io";
import { ChatService } from "./chat.service";
export declare class ChatGateway implements OnGatewayConnection, OnGatewayDisconnect {
    private readonly chatService;
    server: Server;
    static serverInstance: Server;
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
    }, client: Socket): Promise<void>;
    handleStartConversation(data: {
        buyerId: string;
        sellerId: string;
    }, client: Socket): Promise<void>;
    handleMarkAsRead(data: {
        conversationId: string;
        userId: string;
    }): Promise<void>;
}
