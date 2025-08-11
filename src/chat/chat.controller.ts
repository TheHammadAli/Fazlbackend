import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  Query,
  Patch,
} from '@nestjs/common';
import { ChatService } from './chat.service';
import { PaginationDto } from 'src/common/dto/pagination.dto';
import { ApiTags, ApiOperation, ApiResponse, ApiBody } from '@nestjs/swagger';
import { CreateMessageDto } from './dto/create-message.dto';

@ApiTags('Chat')
@Controller('chat')
export class ChatController {
  constructor(private readonly chatService: ChatService) {}

  @Post('conversation')
  @ApiOperation({
    summary: 'Get or create a conversation between buyer and seller',
  })
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        buyerId: { type: 'string', example: '6645f1d8a8c02c2b8f5a9df0' },
        sellerId: { type: 'string', example: '6645f1d8a8c02c2b8f5a9df1' },
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

  @Post('message')
  @ApiOperation({ summary: 'Send a message in a conversation' })
  @ApiBody({ type: CreateMessageDto })
  async sendMessage(@Body() body: CreateMessageDto) {
    return this.chatService.sendMessage(
      body.conversationId,
      body.senderId,
      body.receiverId,
      body.text,
    );
  }

  @Get('messages/:conversationId')
  @ApiOperation({ summary: 'Get paginated messages for a conversation' })
  async getMessages(
    @Param('conversationId') conversationId: string,
    @Query() paginationDto: PaginationDto,
  ) {
    return this.chatService.getMessages(conversationId, paginationDto);
  }

  @Patch('messages/mark-read')
  @ApiOperation({
    summary: 'Mark all messages as read for a user in a conversation',
  })
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        conversationId: { type: 'string', example: '665f6d9a3ef12a0c4c122d23' },
        userId: { type: 'string', example: '6645f1d8a8c02c2b8f5a9df2' },
      },
    },
  })
  async markAsRead(@Body() body: { conversationId: string; userId: string }) {
    return this.chatService.markAsRead(body.conversationId, body.userId);
  }

  @Get('messages/unread/:userId')
  @ApiOperation({ summary: 'Get count of unread conversations for a user' })
  async getUnreadCount(@Param('userId') userId: string) {
    return this.chatService.getUnreadConversations(userId);
  }

  @Post('broadcast')
  @ApiOperation({
    summary: 'Broadcast message to nearby sellers based on location',
  })
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        buyerId: { type: 'string', example: '6645f1d8a8c02c2b8f5a9df4' },
        coordinates: {
          type: 'array',
          items: { type: 'number' },
          example: [73.0479, 33.6844],
        },
        radius: { type: 'number', example: 10 },
        text: {
          type: 'string',
          example: 'Are you selling any electronics nearby?',
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
