// src/notifications/notifications.gateway.ts
import {
  WebSocketGateway,
  WebSocketServer,
  OnGatewayConnection,
  OnGatewayDisconnect,
} from "@nestjs/websockets";
import { Server, Socket } from "socket.io";
import { NotificationsService } from "./notifications.service";
import { PresenceService } from "src/presence/presence.service";
import { UsersService } from "src/users/users.service";

@WebSocketGateway({ cors: { origin: "*" } })
export class NotificationsGateway
  implements OnGatewayConnection, OnGatewayDisconnect
{
  @WebSocketServer()
  server!: Server;

  constructor(
    private readonly notificationsService: NotificationsService,
    private readonly presenceService: PresenceService,
    private readonly usersService: UsersService,
  ) {}

  afterInit(server: Server) {
    this.notificationsService.setServer(server);
  }

  handleConnection(client: Socket) {
    const userId = client.handshake.query.userId as string;
    if (userId) {
      client.join(userId);
      this.presenceService.addConnection(userId, client.id);
      console.log(`User ${userId} connected`);
    } else {
      client.disconnect();
      console.log("Client without userId disconnected");
    }
  }

  async handleDisconnect(client: Socket) {
    const userId = client.handshake.query.userId as string;
    if (!userId) return;

    console.log(`User ${userId} disconnected`);
    const wentOffline = this.presenceService.removeConnection(userId, client.id);
    if (wentOffline) {
      await this.usersService.touchLastSeen(userId);
    }
  }
}
