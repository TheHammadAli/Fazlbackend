import { NotificationsService } from './notifications.service';
export declare class NotificationsController {
    private readonly notificationsService;
    constructor(notificationsService: NotificationsService);
    createNotification(userId: string, message: string, type: 'ORDER' | 'MESSAGE' | 'PROMOTION'): Promise<import("mongoose").Document<unknown, {}, import("./schema/notifications.schema").Notification, {}> & import("./schema/notifications.schema").Notification & Required<{
        _id: unknown;
    }> & {
        __v: number;
    }>;
    getUserNotifications(userId: string): Promise<(import("mongoose").Document<unknown, {}, import("./schema/notifications.schema").Notification, {}> & import("./schema/notifications.schema").Notification & Required<{
        _id: unknown;
    }> & {
        __v: number;
    })[]>;
    getUnreadNotificationCount(userId: string): Promise<{
        count: number;
    }>;
    markAsRead(id: string): Promise<import("mongoose").Document<unknown, {}, import("./schema/notifications.schema").Notification, {}> & import("./schema/notifications.schema").Notification & Required<{
        _id: unknown;
    }> & {
        __v: number;
    }>;
    deleteNotification(id: string): Promise<{
        deleted: boolean;
    }>;
    testNotification(body: {
        userId: string;
        message: string;
    }): Promise<import("mongoose").Document<unknown, {}, import("./schema/notifications.schema").Notification, {}> & import("./schema/notifications.schema").Notification & Required<{
        _id: unknown;
    }> & {
        __v: number;
    }>;
}
