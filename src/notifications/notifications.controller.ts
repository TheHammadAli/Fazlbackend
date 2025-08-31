// notifications.controller.ts
import {
    Controller, Get, Param, Patch, Delete, Post, Body
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiParam, ApiBody, ApiResponse } from '@nestjs/swagger';
import { NotificationsService } from './notifications.service';

@ApiTags('Notifications')
@Controller('notifications')
export class NotificationsController {
    constructor(private readonly notificationsService: NotificationsService) { }

    @Post()
    @ApiOperation({ summary: 'Create a new notification' })
    @ApiBody({
        schema: {
            type: 'object',
            properties: {
                userId: { type: 'string', example: '64fc91d9f7b9c1d4f9a8a123' },
                message: { type: 'string', example: 'Your order has been placed!' },
                type: { type: 'string', example: 'ORDER', enum: ['ORDER', 'MESSAGE', 'PROMOTION'] },
            },
            required: ['userId', 'message'],
        },
    })
    @ApiResponse({ status: 201, description: 'Notification created successfully' })
    async createNotification(
        @Body('userId') userId: string,
        @Body('message') message: string,
        @Body('type') type: 'ORDER' | 'MESSAGE' | 'PROMOTION',
    ) {
        return this.notificationsService.create(userId, message,type);
    }

    @Get(':userId')
    @ApiOperation({ summary: 'Get all notifications for a user' })
    @ApiParam({ name: 'userId', description: 'The ID of the user' })
    @ApiResponse({ status: 200, description: 'List of notifications' })
    async getUserNotifications(@Param('userId') userId: string) {
        return this.notificationsService.findByUser(userId);
    }

    @Patch(':id/read')
    @ApiOperation({ summary: 'Mark a notification as read' })
    @ApiParam({ name: 'id', description: 'The ID of the notification' })
    @ApiResponse({ status: 200, description: 'Notification marked as read' })
    async markAsRead(@Param('id') id: string) {
        return this.notificationsService.markAsRead(id);
    }

    @Delete(':id')
    @ApiOperation({ summary: 'Delete a notification' })
    @ApiParam({ name: 'id', description: 'The ID of the notification' })
    @ApiResponse({ status: 200, description: 'Notification deleted successfully' })
    async deleteNotification(@Param('id') id: string) {
        return this.notificationsService.delete(id);
    }
}
