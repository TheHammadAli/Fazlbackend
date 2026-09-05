import {
  OnGatewayConnection,
  OnGatewayDisconnect,
  SubscribeMessage,
  WebSocketGateway,
  WebSocketServer,
  MessageBody,
  ConnectedSocket,
  OnGatewayInit,
} from "@nestjs/websockets";
import { Server, Socket } from "socket.io";
import { ChatService } from "./chat.service";
import { forwardRef, Inject, Logger } from "@nestjs/common";
import { PresenceService } from "src/presence/presence.service";
import { UsersService } from "src/users/users.service";

@WebSocketGateway({
  namespace: "/chat",
  cors: {
    origin: "*", // Adjust in production
  },
})
export class ChatGateway implements OnGatewayConnection, OnGatewayDisconnect, OnGatewayInit {
  @WebSocketServer()
  server!: Server;
  static serverInstance: Server;

  afterInit(server: Server) {
    ChatGateway.serverInstance = server;
    this.presenceService.registerServer(server);
  }

  private logger: Logger = new Logger("ChatGateway");

  constructor(
    @Inject(forwardRef(() => ChatService))
    private readonly chatService: ChatService,
    private readonly presenceService: PresenceService,
    @Inject(forwardRef(() => UsersService))
    private readonly usersService: UsersService,
  ) { }

  // Presence is tracked here as well as on the notifications gateway. The mobile
  // app only ever connects to /chat, so without this it never registered as
  // online at all. PresenceService counts sockets per user, so a client on both
  // namespaces is simply two connections and stays online until the last drops.
  handleConnection(client: Socket) {
    const userId = client.handshake.query.userId as string;
    if (!userId) return;

    client.join(userId);
    const cameOnline = this.presenceService.addConnection(userId, client.id);
    if (cameOnline) {
      this.presenceService.broadcastChange({
        userId,
        isOnline: true,
        lastSeenAt: null,
      });
      // Being connected is enough to deliver — the conversation does not need to be
      // open. Non-blocking so a slow flush never delays the connection handshake.
      this.chatService.deliverPendingMessagesForUser(userId).catch((err) => {
        this.logger.error(`Failed to flush pending deliveries for ${userId}`, err);
      });
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

  /** See NotificationsGateway.handleWatchPresence — same contract on this namespace. */
  @SubscribeMessage("watchPresence")
  async handleWatchPresence(
    @MessageBody() data: { userIds?: string[] },
    @ConnectedSocket() client: Socket,
  ) {
    const userIds = (data?.userIds ?? []).filter(Boolean);
    for (const id of userIds) {
      client.join(PresenceService.room(id));
    }

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

  @SubscribeMessage("joinConversation")
  async handleJoinRoom(
    @MessageBody() data: { conversationId: string },
    @ConnectedSocket() client: Socket,
  ) {
    client.join(data.conversationId);
    this.logger.log(
      `Client ${client.id} joined conversation ${data.conversationId}`,
    );
  }

  @SubscribeMessage("sendMessage")
  async handleSendMessage(
    @MessageBody()
    data: {
      conversationId: string;
      senderId: string;
      receiverId: string;
      text: string;
    },
    @ConnectedSocket() client: Socket,
  ) {
    const message = await this.chatService.sendMessage(
      data.conversationId,
      data.senderId,
      data.receiverId,
      data.text,
    );

    this.server.to(data.conversationId).emit("receiveMessage", message);


    return message;
  }

  @SubscribeMessage("startConversation")
  async handleStartConversation(
    @MessageBody() data: { buyerId: string; sellerId: string },
    @ConnectedSocket() client: Socket,
  ) {
    const convo = await this.chatService.getOrCreateConversation(
      data.buyerId,
      data.sellerId,
    );
    client.join(convo?.id.toString());
    this.logger.log(
      `Client ${client.id} joined or created conversation ${convo?._id}`,
    );
    client.emit("conversationStarted", convo);
  }

  @SubscribeMessage("markAsRead")
  async handleMarkAsRead(
    @MessageBody() data: { conversationId: string; userId: string },
  ) {
    await this.chatService.markAsRead(data.conversationId, data.userId);
    this.server.to(data.conversationId).emit("messagesMarkedAsRead", {
      userId: data.userId,
    });
  }
}
