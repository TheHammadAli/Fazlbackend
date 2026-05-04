import { OnGatewayConnection, OnGatewayDisconnect, OnGatewayInit } from "@nestjs/websockets";
import { Server, Socket } from "socket.io";
import { BroadcastService } from "./broadcast.service";
export declare class BroadcastGateway implements OnGatewayConnection, OnGatewayDisconnect, OnGatewayInit {
    private readonly broadcastService;
    server: Server;
    static serverInstance: Server;
    afterInit(server: Server): void;
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
    }, client: Socket): Promise<{
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
    handleJoinBroadcast(data: {
        broadcastId: string;
        threadId: string;
    }, client: Socket): Promise<void>;
    handleLeaveBroadcast(data: {
        broadcastId: string;
        threadId: string;
    }, client: Socket): Promise<void>;
}
