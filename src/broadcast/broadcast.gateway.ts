import {
  OnGatewayConnection,
  OnGatewayDisconnect,
  SubscribeMessage,
  WebSocketGateway,
  WebSocketServer,
  MessageBody,
  ConnectedSocket,
} from "@nestjs/websockets";
import { Server, Socket } from "socket.io";
import { BroadcastService } from "./broadcast.service";
import { Logger } from "@nestjs/common";

@WebSocketGateway({
  cors: {
    origin: "*", // Adjust in production
  },
})
export class BroadcastGateway
  implements OnGatewayConnection, OnGatewayDisconnect
{
  @WebSocketServer()
  server!: Server;

  private logger: Logger = new Logger("BroadcastGateway");

  constructor(private readonly broadcastService: BroadcastService) {}

  handleConnection(client: Socket) {
    this.logger.log(`Client connected: ${client.id}`);
  }

  handleDisconnect(client: Socket) {
    this.logger.log(`Client disconnected: ${client.id}`);
  }

  @SubscribeMessage("joinThread")
  async handleJoinThread(
    @MessageBody() data: { threadId: string },
    @ConnectedSocket() client: Socket,
  ) {
    client.join(data.threadId);
    this.logger.log(`Client ${client.id} joined thread ${data.threadId}`);
  }

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
    const newMessage = await this.broadcastService.sendBroadcastMessage(
      data.broadcastId,
      data.senderId,
      data.receiverId,
      data.threadId,
      data.message,
    );

    // Emit the message to all clients in the thread room
    this.server.to(data.threadId).emit("receiveBroadcastMessage", newMessage);
  }

  @SubscribeMessage("joinBroadcast")
  async handleJoinBroadcast(
    @MessageBody() data: { broadcastId: string; threadId: string },
    @ConnectedSocket() client: Socket,
  ) {
    // Join both broadcast and thread rooms for flexibility
    client.join(data.broadcastId);
    client.join(data.threadId);
    this.logger.log(
      `Client ${client.id} joined broadcast ${data.broadcastId} and thread ${data.threadId}`,
    );
  }

  @SubscribeMessage("leaveBroadcast")
  async handleLeaveBroadcast(
    @MessageBody() data: { broadcastId: string; threadId: string },
    @ConnectedSocket() client: Socket,
  ) {
    client.leave(data.threadId);
    client.leave(data.broadcastId);
    this.logger.log(
      `Client ${client.id} left broadcast ${data.broadcastId} and thread ${data.threadId}`,
    );
  }
}
