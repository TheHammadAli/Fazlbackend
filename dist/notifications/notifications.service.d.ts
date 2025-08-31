import { Model, Types } from 'mongoose';
import { Notification } from './schema/notifications.schema';
import { UsersService } from 'src/users/users.service';
export declare class NotificationsService {
    private notificationModel;
    private readonly usersService;
    constructor(notificationModel: Model<Notification>, usersService: UsersService);
    create(userId: string | Types.ObjectId, message: string, type?: 'ORDER' | 'MESSAGE' | 'PROMOTION'): Promise<import("mongoose").Document<unknown, {}, Notification, {}> & Notification & Required<{
        _id: unknown;
    }> & {
        __v: number;
    }>;
    findByUser(userId: string): Promise<(import("mongoose").Document<unknown, {}, Notification, {}> & Notification & Required<{
        _id: unknown;
    }> & {
        __v: number;
    })[]>;
    markAsRead(id: string): Promise<import("mongoose").Document<unknown, {}, Notification, {}> & Notification & Required<{
        _id: unknown;
    }> & {
        __v: number;
    }>;
    delete(id: string): Promise<{
        deleted: boolean;
    }>;
}
