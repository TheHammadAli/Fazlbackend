import {
  BadRequestException,
  Controller,
  Get,
  Post,
  Body,
  Param,
  Query,
  Patch,
  UploadedFiles,
  UseInterceptors,
  Req,
  UseGuards,
} from "@nestjs/common";
import { ChatService } from "./chat.service";
import { PaginationDto } from "src/common/dto/pagination.dto";
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBody,
  ApiConsumes,
  ApiQuery,
  ApiParam,
} from "@nestjs/swagger";
import { CreateMessageDto } from "./dto/create-message.dto";
import { FileFieldsInterceptor } from "@nestjs/platform-express";
import { FileUploadService } from "src/common/file-upload/file-upload.service";
import { Request } from "express";
import { PermissionsGuard } from "src/auth/guard/permissions-guard";
import { JwtAuthGuard } from "src/auth/guard/jwt-auth-guard";
import { RequirePermission } from "src/common/decorators/require-permission.decorator";
import { resolvePagination } from "../common/utils/pagination.util";

@ApiTags("Chat")
@Controller("chat")
export class ChatController {
  constructor(
    private readonly chatService: ChatService,
    private readonly fileUploadService: FileUploadService,
  ) { }

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
        productId: {
          type: "string",
          nullable: true,
          description: "Scopes the conversation to this listing's offer thread instead of the general chat",
          example: "64f0c2abc1234567890abcd",
        },
      },
    },
  })
  async getOrCreateConversation(
    @Body() body: { buyerId: string; sellerId: string; productId?: string },
  ) {
    return this.chatService.getOrCreateConversation(
      body.buyerId,
      body.sellerId,
      body.productId,
    );
  }

  @Post("message")
  @ApiOperation({ summary: "Send a message in a conversation" })
  @ApiConsumes("application/json", "multipart/form-data")
  @ApiBody({
    schema: {
      type: "object",
      properties: {
        conversationId: { type: "string" },
        senderId: { type: "string" },
        receiverId: { type: "string" },
        text: { type: "string" },
        file: {
          type: "string",
          format: "binary",
          nullable: true,
        },
        voice: {
          type: "string",
          format: "binary",
          nullable: true,
        },
        duration: {
          type: "string",
          nullable: true,
          description: "Voice message length in seconds",
        },
      },
    },
  }) // Required for Swagger to show file upload
  @UseInterceptors(
    FileFieldsInterceptor(
      [
        { name: "file", maxCount: 1 },
        { name: "voice", maxCount: 1 },
      ],
      { limits: { fileSize: 20 * 1024 * 1024 } },
    ),
  )
  async sendMessage(
    @Body() body: CreateMessageDto,
    @UploadedFiles()
    files?: { file?: Express.Multer.File[]; voice?: Express.Multer.File[] },
  ) {
    const imageFile = files?.file?.[0];
    const voiceFile = files?.voice?.[0];

    if (voiceFile && !voiceFile.mimetype?.startsWith("audio/")) {
      throw new BadRequestException("voice field must be an audio file");
    }

    let imageUrl: string | undefined;
    let audioUrl: string | undefined;

    if (imageFile && imageFile.size > 0) {
      imageUrl = await this.fileUploadService.uploadChatMessage(
        body.conversationId,
        imageFile,
      );
    }
    if (voiceFile && voiceFile.size > 0) {
      audioUrl = await this.fileUploadService.uploadChatVoiceMessage(
        body.conversationId,
        voiceFile,
      );
    }

    return this.chatService.sendMessage(
      body.conversationId,
      body.senderId,
      body.receiverId,
      body.text,
      imageUrl,
      {
        audioUrl,
        audioDuration: body.duration ? Number(body.duration) : undefined,
      },
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

  @Patch("conversations/:conversationId/read")
  @ApiOperation({
    summary: "Mark all unread messages in a conversation as read",
  })
  async markConversationAsRead(
    @Param("conversationId") conversationId: string,
    @Req() req: Request,
  ) {
    const user = req.user as { sub: string };
    return this.chatService.markAsRead(conversationId, user.sub);
  }

  @Patch("messages/mark-read")
  @UseGuards(JwtAuthGuard)
  @ApiOperation({
    summary: "Mark all messages as read for the authenticated user in a conversation",
  })
  @ApiBody({
    schema: {
      type: "object",
      properties: {
        conversationId: { type: "string", example: "665f6d9a3ef12a0c4c122d23" },
      },
    },
  })
  async markAsRead(@Body() body: { conversationId: string }, @Req() req: Request) {
    const user = req.user as { sub: string };
    return this.chatService.markAsRead(body.conversationId, user.sub);
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
              latestMessage: {
                type: "object",
                properties: {
                  text: { type: "string" },
                  read: { type: "boolean" },
                  createdAt: { type: "string", format: "date-time" },
                  sender: {
                    type: "object",
                    properties: {
                      _id: { type: "string" },
                      name: { type: "string" },
                    },
                  },
                },
              },
              unreadCount: { type: "number", example: 0 },
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

  @Get("admin/conversation")
  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @RequirePermission("bookings")
  @ApiOperation({
    summary: "Admin: get the conversation + paginated messages between a customer and provider",
  })
  @ApiQuery({ name: "customerId", required: true, type: String })
  @ApiQuery({ name: "providerId", required: true, type: String })
  @ApiQuery({ name: "page", required: false, type: Number })
  @ApiQuery({ name: "limit", required: false, type: Number })
  async getAdminConversation(
    @Query("customerId") customerId: string,
    @Query("providerId") providerId: string,
    @Query() paginationDto: PaginationDto,
  ) {
    const conversation = await this.chatService.findConversationBetween(customerId, providerId);

    if (!conversation) {
      const { page: rawPage, limit: rawLimit } = paginationDto;
      const { page, limit, skip } = resolvePagination(rawPage, rawLimit);return {
        conversation: null,
        messages: [],
        meta: { total: 0, page, limit, totalPages: 0 },
      };
    }

    const { data: messages, meta } = await this.chatService.getMessages(
      String(conversation._id),
      paginationDto,
    );

    return {
      conversation: { _id: conversation._id, status: conversation.status },
      messages,
      meta,
    };
  }

  @Get("admin/user/:userId/conversations")
  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @RequirePermission("users")
  @ApiOperation({ summary: "Admin: get paginated conversations for a user, with the other party + latest message" })
  @ApiParam({ name: "userId", required: true })
  @ApiQuery({ name: "page", required: false, type: Number })
  @ApiQuery({ name: "limit", required: false, type: Number })
  async getAdminUserConversations(
    @Param("userId") userId: string,
    @Query() paginationDto: PaginationDto,
  ) {
    return this.chatService.getConversationsByUserId(userId, paginationDto);
  }

  @Get("admin/conversation/:conversationId/messages")
  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @RequirePermission("users")
  @ApiOperation({ summary: "Admin: get paginated messages for a specific conversation" })
  @ApiParam({ name: "conversationId", required: true })
  @ApiQuery({ name: "page", required: false, type: Number })
  @ApiQuery({ name: "limit", required: false, type: Number })
  async getAdminConversationMessages(
    @Param("conversationId") conversationId: string,
    @Query() paginationDto: PaginationDto,
  ) {
    return this.chatService.getMessages(conversationId, paginationDto);
  }
}
