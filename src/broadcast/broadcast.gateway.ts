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
import { BroadcastService } from "./broadcast.service";
import { forwardRef, Inject, Logger } from "@nestjs/common";

@WebSocketGateway({
  cors: {
    origin: "*", // Tighten this in production
  },
})
export class BroadcastGateway
  implements OnGatewayConnection, OnGatewayDisconnect, OnGatewayInit {
  @WebSocketServer()
  server!: Server;

  static serverInstance: Server;

  private readonly logger = new Logger(BroadcastGateway.name);

  constructor(
    @Inject(forwardRef(() => BroadcastService))
    private readonly broadcastService: BroadcastService,
  ) { }

  afterInit(server: Server) {
    BroadcastGateway.serverInstance = server;
    this.logger.log("BroadcastGateway initialized");
  }

  // --------------------------------------------------
  // CONNECTION HANDLING
  // --------------------------------------------------
  async handleConnection(client: Socket) {
    // Expect userId from handshake (auth or query)
    const userId =
      client.handshake.auth?.userId ||
      client.handshake.query?.userId;

    if (userId) {
      const room = userId.toString();
      client.join(room);
      this.logger.log(`Client ${client.id} joined personal room: ${room}`);
    } else {
      this.logger.warn(`Client ${client.id} connected without userId`);
    }

    this.logger.log(`Client connected: ${client.id}`);
  }

  handleDisconnect(client: Socket) {
    this.logger.log(`Client disconnected: ${client.id}`);
  }

  // --------------------------------------------------
  // ROOM MANAGEMENT
  // --------------------------------------------------
  @SubscribeMessage("joinThread")
  handleJoinThread(
    @MessageBody() data: { threadId: string },
    @ConnectedSocket() client: Socket,
  ) {
    if (!data?.threadId) {
      this.logger.warn(`joinThread called without threadId by ${client.id}`);
      return;
    }

    client.join(data.threadId);
    this.logger.log(`Client ${client.id} joined thread: ${data.threadId}`);
  }

  @SubscribeMessage("joinBroadcast")
  handleJoinBroadcast(
    @MessageBody() data: { broadcastId: string; threadId: string },
    @ConnectedSocket() client: Socket,
  ) {
    if (data?.broadcastId) {
      client.join(data.broadcastId);
    }
    if (data?.threadId) {
      client.join(data.threadId);
    }

    this.logger.log(
      `Client ${client.id} joined broadcast ${data?.broadcastId} + thread ${data?.threadId}`,
    );
  }

  @SubscribeMessage("leaveBroadcast")
  handleLeaveBroadcast(
    @MessageBody() data: { broadcastId: string; threadId: string },
    @ConnectedSocket() client: Socket,
  ) {
    if (data?.threadId) client.leave(data.threadId);
    if (data?.broadcastId) client.leave(data.broadcastId);

    this.logger.log(
      `Client ${client.id} left broadcast ${data?.broadcastId} + thread ${data?.threadId}`,
    );
  }

  // --------------------------------------------------
  // SEND MESSAGE VIA SOCKET (optional path)
  // --------------------------------------------------
  @SubscribeMessage("sendBroadcastMessage")
  async handleSendBroadcastMessage(
    @MessageBody()
    data: {
      broadcastId: string;
      threadId: string;
      senderId: string;
      receiverId: string;
      message: string;
    },
    @ConnectedSocket() client: Socket,
  ) {
    try {
      const result = await this.broadcastService.sendBroadcastMessage(
        data.broadcastId,
        data.senderId,
        data.receiverId,
        data.threadId,
        data.message,
      );

      // Service already emits the realtime event
      return result;
    } catch (error) {
      this.logger.error("Error in handleSendBroadcastMessage", error);
      throw error;
    }
  }

  // --------------------------------------------------
  // HELPER USED BY THE SERVICE
  // --------------------------------------------------
  emitToThreadAndUser(
    threadId: string,
    receiverId: string,
    payload: any,
  ) {
    const server = this.server || BroadcastGateway.serverInstance;

    if (!server) {
      this.logger.error("Socket.IO server is not initialized yet");
      return;
    }
    console.log("Emitting to thread and user:", { threadId, receiverId, payload });
    // Emit to the thread room
    server.to(threadId).emit("receiveBroadcastMessage", payload);

    // Emit to the personal user room (fallback)
    server.to(receiverId).emit("receiveBroadcastMessage", payload);

    this.logger.debug(
      `Emitted receiveMessage → thread:${threadId} + user:${receiverId}`,
    );
  }
}