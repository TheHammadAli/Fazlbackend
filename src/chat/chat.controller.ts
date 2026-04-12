import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  Query,
  Patch,
} from "@nestjs/common";
import { ChatService } from "./chat.service";
import { PaginationDto } from "src/common/dto/pagination.dto";
import { ApiTags, ApiOperation, ApiResponse, ApiBody } from "@nestjs/swagger";
import { CreateMessageDto } from "./dto/create-message.dto";

@ApiTags("Chat")
@Controller("chat")
export class ChatController {
  constructor(private readonly chatService: ChatService) {}

  @Post("conversation")
  @ApiOperation({
    summary: "Get or create a conversation between buyer and seller",
  })
  @ApiBody({
    schema: {
      type: "object",
      properties: {
        buyerId: { type: "string", example: "6645f1d8a8c02c2b8f5a9df0" },
        sellerId: { type: "string", example: "6645f1d8a8c02c2b8f5a9df1" },
      },
    },
  })
  async getOrCreateConversation(
    @Body() body: { buyerId: string; sellerId: string },
  ) {
    return this.chatService.getOrCreateConversation(
      body.buyerId,
      body.sellerId,
    );
  }

  @Post("message")
  @ApiOperation({ summary: "Send a message in a conversation" })
  @ApiBody({ type: CreateMessageDto })
  async sendMessage(@Body() body: CreateMessageDto) {
    return this.chatService.sendMessage(
      body.conversationId,
      body.senderId,
      body.receiverId,
      body.text,
    );
  }

  @Get("messages/:conversationId")
  @ApiOperation({ summary: "Get paginated messages for a conversation" })
  async getMessages(
    @Param("conversationId") conversationId: string,
    @Query() paginationDto: PaginationDto,
  ) {
    return this.chatService.getMessages(conversationId, paginationDto);
  }

  @Patch("messages/mark-read")
  @ApiOperation({
    summary: "Mark all messages as read for a user in a conversation",
  })
  @ApiBody({
    schema: {
      type: "object",
      properties: {
        conversationId: { type: "string", example: "665f6d9a3ef12a0c4c122d23" },
        userId: { type: "string", example: "6645f1d8a8c02c2b8f5a9df2" },
      },
    },
  })
  async markAsRead(@Body() body: { conversationId: string; userId: string }) {
    return this.chatService.markAsRead(body.conversationId, body.userId);
  }

  @Get("messages/unread/:userId")
  @ApiOperation({ summary: "Get count of unread conversations for a user" })
  async getUnreadCount(@Param("userId") userId: string) {
    return this.chatService.getUnreadConversations(userId);
  }

  @Get("conversations/:userId")
  @ApiOperation({
    summary: "Get all conversations for a user with pagination",
  })
  @ApiResponse({
    status: 200,
    description: "Paginated list of conversations for the user",
    schema: {
      type: "object",
      properties: {
        meta: {
          type: "object",
          properties: {
            total: { type: "number", example: 10 },
            page: { type: "number", example: 1 },
            limit: { type: "number", example: 10 },
            totalPages: { type: "number", example: 1 },
          },
        },
        data: {
          type: "array",
          items: {
            type: "object",
            properties: {
              _id: { type: "string" },
              buyer: {
                type: "object",
                properties: {
                  _id: { type: "string" },
                  name: { type: "string" },
                  email: { type: "string" },
                  profilePicture: { type: "string" },
                },
              },
              seller: {
                type: "object",
                properties: {
                  _id: { type: "string" },
                  name: { type: "string" },
                  email: { type: "string" },
                  profilePicture: { type: "string" },
                },
              },
              status: { type: "string", enum: ["open", "closed"] },
              lastMessageAt: { type: "string", format: "date-time" },
              createdAt: { type: "string", format: "date-time" },
              updatedAt: { type: "string", format: "date-time" },
            },
          },
        },
      },
    },
  })
  async getConversationsByUserId(
    @Param("userId") userId: string,
    @Query() paginationDto: PaginationDto,
  ) {
    return this.chatService.getConversationsByUserId(userId, paginationDto);
  }

  @Post("broadcast")
  @ApiOperation({
    summary: "Broadcast message to nearby sellers based on location",
  })
  @ApiBody({
    schema: {
      type: "object",
      properties: {
        buyerId: { type: "string", example: "6645f1d8a8c02c2b8f5a9df4" },
        coordinates: {
          type: "array",
          items: { type: "number" },
          example: [73.0479, 33.6844],
        },
        radius: { type: "number", example: 10 },
        text: {
          type: "string",
          example: "Are you selling any electronics nearby?",
        },
      },
    },
  })
  async broadcast(
    @Body()
    body: {
      buyerId: string;
      coordinates: [number, number];
      radius: number;
      text: string;
    },
  ) {
    return this.chatService.broadcastMessageToNearbySellers(
      body.buyerId,
      body.coordinates,
      body.radius,
      body.text,
    );
  }
}
