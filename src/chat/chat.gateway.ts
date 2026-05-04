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

@WebSocketGateway({
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
  }



  private logger: Logger = new Logger("ChatGateway");

  constructor(
    @Inject(forwardRef(() => ChatService))
    private readonly chatService: ChatService,
  ) { }

  handleConnection(client: Socket) {
    console.log("Client connected", client.id);
  }

  handleDisconnect(client: Socket) {
    this.logger.log(`Client disconnected: ${client.id}`);
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
