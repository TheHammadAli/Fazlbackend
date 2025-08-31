// notifications.gateway.ts
import {
    WebSocketGateway,
    WebSocketServer,
    OnGatewayConnection,
    OnGatewayDisconnect,
    ConnectedSocket,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { NotificationsService } from './notifications.service';
import { Types } from 'mongoose';

@WebSocketGateway({
    cors: {
        origin: '*', // adjust to your frontend
    },
})
export class NotificationsGateway implements OnGatewayConnection, OnGatewayDisconnect {
    @WebSocketServer()
    server: Server;

    constructor(private readonly notificationsService: NotificationsService) { }

    /** Called when a client connects */
    handleConnection(client: Socket) {
        const userId = client.handshake.query.userId as string;

        if (userId) {
            // Join a room named after the userId
            client.join(userId);
            console.log(`User ${userId} connected to notifications gateway`);
        } else {
            console.log('A client connected without userId, disconnecting...');
            client.disconnect();
        }
    }

    /** Called when a client disconnects */
    handleDisconnect(client: Socket) {
        const userId = client.handshake.query.userId as string;
        if (userId) {
            console.log(`User ${userId} disconnected`);
        }
    }

    /** Send a notification to a specific user */
    async sendNotification(userId: string | Types.ObjectId, message: string) {
        const notif = await this.notificationsService.create(userId, message);
        this.server.to(userId.toString()).emit('notification', notif);
        return notif;
    }
}
