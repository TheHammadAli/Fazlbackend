import { OnGatewayConnection, OnGatewayDisconnect } from "@nestjs/websockets";
import { Server, Socket } from "socket.io";
import { BroadcastService } from "./broadcast.service";
export declare class BroadcastGateway implements OnGatewayConnection, OnGatewayDisconnect {
    private readonly broadcastService;
    server: Server;
    static serverInstance: Server;
    private logger;
    constructor(broadcastService: BroadcastService);
    handleConnection(client: Socket): void;
    handleDisconnect(client: Socket): void;
    handleJoinThread(data: {
        threadId: string;
    }, client: Socket): Promise<void>;
    handleSendBroadcastMessage(data: {
        broadcastId: string;
        threadId: string;
        senderId: string;
        receiverId: string;
        message: string;
    }, client: Socket): Promise<void>;
    handleJoinBroadcast(data: {
        broadcastId: string;
        threadId: string;
    }, client: Socket): Promise<void>;
    handleLeaveBroadcast(data: {
        broadcastId: string;
        threadId: string;
    }, client: Socket): Promise<void>;
}
