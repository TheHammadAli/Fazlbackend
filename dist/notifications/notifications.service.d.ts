import { Model, Types } from "mongoose";
import { I18nService } from "nestjs-i18n";
import { Notification } from "./schema/notifications.schema";
import { UsersService } from "src/users/users.service";
import { Server } from "socket.io";
import { FirebaseService } from "./firebase.service";
import { ClsService } from "nestjs-cls";
export declare class NotificationsService {
    private notificationModel;
    private readonly usersService;
    private readonly firebaseService;
    private readonly i18n;
    private readonly cls;
    private server;
    private readonly defaultSoundPaths;
    constructor(notificationModel: Model<Notification>, usersService: UsersService, firebaseService: FirebaseService, i18n: I18nService, cls: ClsService);
    private get lang();
    setServer(server: Server): void;
    private buildNotificationPayload;
    create<T = Record<string, any>>(userId: string | Types.ObjectId, message: string, type: "ORDER" | "MESSAGE" | "PROMOTION" | "SERVICE_REQUEST" | undefined, payload: T): Promise<import("mongoose").Document<unknown, {}, Notification, {}> & Notification & Required<{
        _id: unknown;
    }> & {
        __v: number;
    }>;
    createAndNotify<T = Record<string, any>>(userId: string | Types.ObjectId, messageKey: string, type: "ORDER" | "MESSAGE" | "PROMOTION" | "SERVICE_REQUEST", payload: T, i18nArgs?: Record<string, any>): Promise<(import("mongoose").Document<unknown, {}, Notification, {}> & Notification & Required<{
        _id: unknown;
    }> & {
        __v: number;
    }) | null>;
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
