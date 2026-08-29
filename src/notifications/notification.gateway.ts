// src/notifications/notifications.gateway.ts
import {
  WebSocketGateway,
  WebSocketServer,
  OnGatewayConnection,
  OnGatewayDisconnect,
  SubscribeMessage,
  MessageBody,
  ConnectedSocket,
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
    this.presenceService.registerServer(server);
  }

  handleConnection(client: Socket) {
    const userId = client.handshake.query.userId as string;
    if (userId) {
      client.join(userId);
      const cameOnline = this.presenceService.addConnection(userId, client.id);
      if (cameOnline) {
        this.presenceService.broadcastChange({
          userId,
          isOnline: true,
          lastSeenAt: null,
        });
      }
    } else {
      client.disconnect();
    }
  }

  async handleDisconnect(client: Socket) {
    const userId = client.handshake.query.userId as string;
    if (!userId) return;

    const wentOffline = this.presenceService.removeConnection(userId, client.id);
    if (wentOffline) {
      const lastSeenAt = new Date();
      await this.usersService.touchLastSeen(userId);
      this.presenceService.broadcastChange({
        userId,
        isOnline: false,
        lastSeenAt,
      });
    }
  }

  /**
   * Subscribes this socket to presence changes for a specific set of users, and
   * answers with their current state.
   *
   * Scoped on purpose: broadcasting every connect and disconnect to every socket
   * would tell the whole user base who is online. A client only ever asks for the
   * people it is actually showing.
   */
  @SubscribeMessage("watchPresence")
  async handleWatchPresence(
    @MessageBody() data: { userIds?: string[] },
    @ConnectedSocket() client: Socket,
  ) {
    const userIds = (data?.userIds ?? []).filter(Boolean);
    for (const id of userIds) {
      client.join(PresenceService.room(id));
    }

    // The snapshot carries lastSeenAt as well as online state: a client that
    // opened a chat directly has no other source for the timestamp, and would
    // otherwise show nothing under the name until the peer happened to go
    // offline while it was watching.
    const online = this.presenceService.getOnlineUserIds(userIds);
    const lastSeen = await this.usersService.getLastSeenFor(userIds);
    client.emit(
      "presenceSnapshot",
      userIds.map((userId) => ({
        userId,
        isOnline: online.has(userId),
        lastSeenAt: lastSeen[userId] ?? null,
      })),
    );
  }
}
