import { Model, Types } from 'mongoose';
import { Notification } from './schema/notifications.schema';
import { UsersService } from 'src/users/users.service';
import { Server } from 'socket.io';
import { FirebaseService } from './firebase.service';
export declare class NotificationsService {
    private notificationModel;
    private readonly usersService;
    private readonly firebaseService;
    private server;
    constructor(notificationModel: Model<Notification>, usersService: UsersService, firebaseService: FirebaseService);
    setServer(server: Server): void;
    create(userId: string | Types.ObjectId, message: string, type?: 'ORDER' | 'MESSAGE' | 'PROMOTION'): Promise<import("mongoose").Document<unknown, {}, Notification, {}> & Notification & Required<{
        _id: unknown;
    }> & {
        __v: number;
    }>;
    createAndNotify(userId: string | Types.ObjectId, message: string, type?: 'ORDER' | 'MESSAGE' | 'PROMOTION'): Promise<import("mongoose").Document<unknown, {}, Notification, {}> & Notification & Required<{
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
