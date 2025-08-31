// notifications.service.ts
import { BadRequestException, forwardRef, Inject, Injectable, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { Notification } from './schema/notifications.schema';
import { UsersService } from 'src/users/users.service';

@Injectable()
export class NotificationsService {
    constructor(
        @InjectModel(Notification.name) private notificationModel: Model<Notification>,
        @Inject(forwardRef(() => UsersService)) private readonly usersService: UsersService,
    ) { }

    async create(userId: string | Types.ObjectId, message: string, type: 'ORDER' | 'MESSAGE' | 'PROMOTION' = 'MESSAGE') {
        const user = await this.usersService.findUserById(userId.toString());
        if (!user) throw new BadRequestException('User does not exist');
        const notif = new this.notificationModel({
            userId: new Types.ObjectId(userId),
            message,
            type,
            read: false,
        });
        return notif.save();
    }

    async findByUser(userId: string) {
        const user = await this.usersService.findUserById(userId.toString());
        if (!user) throw new BadRequestException('User does not exist');
        return this.notificationModel
            .find({ userId: new Types.ObjectId(userId) })
            .sort({ createdAt: -1 })
            .exec();
    }

    async markAsRead(id: string) {
        
        const notif = await this.notificationModel.findByIdAndUpdate(
            id,
            { read: true },
            { new: true },
        );
        if (!notif) throw new NotFoundException(`Notification ${id} not found`);
        return notif;
    }

    async delete(id: string) {
        const result = await this.notificationModel.findByIdAndDelete(id).exec();
        if (!result) throw new NotFoundException(`Notification ${id} not found`);
        return { deleted: true };
    }
}
