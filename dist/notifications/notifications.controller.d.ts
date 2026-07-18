import { NotificationsService } from "./notifications.service";
import { GetNotificationsQueryDto } from "./dto/get-notifications-query.dto";
export declare class NotificationsController {
    private readonly notificationsService;
    constructor(notificationsService: NotificationsService);
    getUserNotifications(userId: string, query: GetNotificationsQueryDto): Promise<{
        data: {
            notifications: (import("mongoose").Document<unknown, {}, import("./schema/notifications.schema").Notification, {}> & import("./schema/notifications.schema").Notification & Required<{
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
    }): Promise<(import("mongoose").Document<unknown, {}, import("./schema/notifications.schema").Notification, {}> & import("./schema/notifications.schema").Notification & Required<{
        _id: unknown;
    }> & {
        __v: number;
    }) | null>;
}
