import { OnGatewayConnection, OnGatewayDisconnect } from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { NotificationsService } from './notifications.service';
import { Types } from 'mongoose';
export declare class NotificationsGateway implements OnGatewayConnection, OnGatewayDisconnect {
    private readonly notificationsService;
    server: Server;
    constructor(notificationsService: NotificationsService);
    handleConnection(client: Socket): void;
    handleDisconnect(client: Socket): void;
    sendNotification(userId: string | Types.ObjectId, message: string): Promise<import("mongoose").Document<unknown, {}, import("./schema/notifications.schema").Notification, {}> & import("./schema/notifications.schema").Notification & Required<{
        _id: unknown;
    }> & {
        __v: number;
    }>;
}
