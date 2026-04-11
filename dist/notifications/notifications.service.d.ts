import { Model, Types } from "mongoose";
import { Notification } from "./schema/notifications.schema";
import { UsersService } from "src/users/users.service";
import { Server } from "socket.io";
import { FirebaseService } from "./firebase.service";
export declare class NotificationsService {
    private notificationModel;
    private readonly usersService;
    private readonly firebaseService;
    private server;
    constructor(notificationModel: Model<Notification>, usersService: UsersService, firebaseService: FirebaseService);
    setServer(server: Server): void;
    create(userId: string | Types.ObjectId, message: string, type?: "ORDER" | "MESSAGE" | "PROMOTION" | "SERVICE_REQUEST"): Promise<import("mongoose").Document<unknown, {}, Notification, {}> & Notification & Required<{
        _id: unknown;
    }> & {
        __v: number;
    }>;
    createAndNotify(userId: string | Types.ObjectId, message: string, type?: "ORDER" | "MESSAGE" | "PROMOTION" | "SERVICE_REQUEST"): Promise<import("mongoose").Document<unknown, {}, Notification, {}> & Notification & Required<{
        _id: unknown;
    }> & {
        __v: number;
    }>;
    findByUser(userId: string, page?: number, limit?: number): Promise<{
        data: {
            notifications: (import("mongoose").Document<unknown, {}, Notification, {}> & Notification & Required<{
                _id: unknown;
            }> & {
                __v: number;
            })[];
            total: number;
            page: number;
            limit: number;
            totalPages: number;
        };
    }>;
    markAsRead(id: string): Promise<import("mongoose").Document<unknown, {}, Notification, {}> & Notification & Required<{
        _id: unknown;
    }> & {
        __v: number;
    }>;
    delete(id: string): Promise<{
        deleted: boolean;
    }>;
    getUnreadCount(userId: string): Promise<number>;
}
