import {
  Controller,
  Post,
  Body,
  Get,
  Param,
  Req,
  UseGuards,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiParam,
  ApiBearerAuth,
} from '@nestjs/swagger';
import { Request } from 'express';

import { BroadcastService } from './broadcast.service';
import { CreateBroadcastDto } from './dto/create-broadcast.dto';
import { SendBroadcastMessageDto } from './dto/send-broadcast.dto';

// ✅ import your guard
import { JwtAuthGuard } from '../auth/guard/jwt-auth-guard';

@ApiTags('Broadcast')
@ApiBearerAuth('jwt')
@UseGuards(JwtAuthGuard) // 🔥 protects ALL routes in controller
@Controller('broadcast')
export class BroadcastController {
  constructor(private readonly broadcastService: BroadcastService) {}

  // 🚀 Create broadcast
  @Post("/create")
  @ApiOperation({ summary: 'Create broadcast and dispatch sellers' })
  async createBroadcast(@Body() dto: CreateBroadcastDto, @Req() req: Request) {
    const user = req.user as {
      sub: string;
      location: { type: string; coordinates: [number, number] };
    };
   
    const buyerId = user.sub;
    const location = user.location;

    return this.broadcastService.createBroadcastAndDispatch(
      dto,
      buyerId,
      location,
    );
  }

  // 💬 Send message in broadcast thread
  @Post('/message/:id')
  @ApiOperation({ summary: 'Send message in broadcast thread' })
  @ApiParam({ name: 'id', description: 'Broadcast ID' })
  async sendMessage(
    @Param('id') broadcastId: string,
    @Body() dto: SendBroadcastMessageDto,
    @Req() req: Request,
  ) {
    const user = req.user as { sub: string };
    const senderId = user.sub;
    
    return this.broadcastService.sendBroadcastMessage(
      broadcastId,
      senderId,
      dto.receiverId,
      dto.threadId,
      dto.message,
    );
  }

  // 📥 Get all threads
  @Get('threads/:id')
  @ApiOperation({ summary: 'Get all threads for a broadcast' })
  async getThreads(@Param('id') broadcastId: string) {
    return this.broadcastService.getBroadcastThreads(broadcastId);
  }

  // 💬 Get messages in thread
  @Get(':id/threads/:threadId')
  @ApiOperation({ summary: 'Get messages for a thread' })
  async getThreadMessages(
    @Param('id') broadcastId: string,
    @Param('threadId') threadId: string,
  ) {
    return this.broadcastService.getThreadMessages( threadId);
  }
  // 📤 Buyer broadcasts
// 📤 Buyer broadcasts
@Get('/my/broadcasts')
@ApiOperation({ summary: 'Get broadcasts created by logged-in user (buyer)' })

async getMyBroadcasts(@Req() req: Request) {
  const user = req.user as { sub: string };
  return this.broadcastService.getBroadcastsByBuyer(user.sub);
}

// 📥 Seller broadcasts
@Get('/my/received')
@ApiOperation({ summary: 'Get broadcasts where logged-in user is a seller' })
@ApiBearerAuth('jwt')
async getReceivedBroadcasts(@Req() req: Request) {
  const user = req.user as { sub: string };
  return this.broadcastService.getBroadcastsForSeller(user.sub);
}}