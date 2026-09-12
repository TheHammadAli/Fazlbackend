// src/notifications/notifications.service.ts
import {
  BadRequestException,
  forwardRef,
  Inject,
  Injectable,
  NotFoundException,
} from "@nestjs/common";
import { I18nService } from "nestjs-i18n";
import { PrismaService } from "src/prisma/prisma.service";
import { generateObjectId } from "src/common/utils/object-id.util";
import type { NotificationType } from "./model/notification.model";
import type { Prisma } from "../../generated/prisma/client";
import { UsersService } from "src/users/users.service";
import { Server } from "socket.io";
import { FirebaseService } from "./firebase.service";
import { ClsService } from "nestjs-cls";
import { resolvePagination } from "src/common/utils/pagination.util";

@Injectable()
export class NotificationsService {
  private server!: Server;
  private readonly defaultSoundPaths = {
    sound1: "/media/AUD-20260708-WA0029.mp3",
    sound2: "/media/AUD-20260708-WA0030.mp3",
  };

  constructor(
    private readonly prisma: PrismaService,
    @Inject(forwardRef(() => UsersService))
    private readonly usersService: UsersService,
    private readonly firebaseService: FirebaseService,
    private readonly i18n: I18nService,
    private readonly cls: ClsService,
  ) { }

  private get lang(): string {
    return this.cls.get("lang") || "en";
  }

  setServer(server: Server) {
    this.server = server;
  }

  private buildNotificationPayload<T = Record<string, any>>(payload: T) {
    return {
      ...(payload as Record<string, any>),
      sound1: this.defaultSoundPaths.sound1,
      sound2: this.defaultSoundPaths.sound2,
    } as Record<string, any>;
  }

  /**
   * Every push target for a user: the multi-device list plus the legacy
   * single-token field, so devices that registered before multi-device support
   * keep working until they next re-register.
   */
  private collectFcmTokens(user: any): string[] {
    const tokens: string[] = [...(user?.fcmTokens ?? [])];
    if (user?.fcmToken) tokens.push(user.fcmToken);
    return [...new Set(tokens.filter(Boolean))];
  }

  /** Delivers one notification to all of a user's devices, pruning dead tokens. */
  private async pushToUserDevices(
    userId: string,
    user: any,
    title: string,
    body: string,
    payload: Record<string, any>,
  ) {
    const tokens = this.collectFcmTokens(user);
    if (tokens.length === 0) {
      return { tokenCount: 0, successCount: 0, staleTokens: [], errors: [] };
    }

    const result = await this.firebaseService.sendNotificationToTokens(
      tokens,
      title,
      body,
      payload,
    );

    if (result.staleTokens.length) {
      await this.usersService.removeFcmTokens(userId, result.staleTokens);
    }

    return { tokenCount: tokens.length, ...result };
  }

  /**
   * Push-only probe for the /notifications/test endpoint.
   *
   * The normal send path swallows FCM failures so a delivery problem can never
   * break the caller's request — which also means a broken credential looks
   * exactly like success from outside. This reports what actually happened, so
   * the cause can be read off an HTTP response instead of the server's log.
   */
  async sendTestPush(userId: string, message: string) {
    const user = await this.usersService.findUserById(userId.toString());
    if (!user) {
      throw new BadRequestException(
        this.i18n.translate("auth.notifications.user_not_found", {
          lang: this.lang,
        }),
      );
    }

    const tokens = this.collectFcmTokens(user);
    const result = await this.pushToUserDevices(
      userId,
      user,
      "Push diagnostic",
      message || "test",
      { type: "ANNOUNCEMENT" },
    );

    return {
      userId,
      firebase: this.firebaseService.getCredentialInfo(),
      tokensStored: tokens.length,
      tokenPreviews: tokens.map((t) => `${t.slice(0, 10)}...${t.slice(-6)}`),
      ...result,
    };
  }

  async create<T = Record<string, any>>(
    userId: string,
    message: string,
    type: NotificationType = "MESSAGE",
    payload: T,
  ) {
    const user = await this.usersService.findUserById(userId.toString());
    if (!user) {
      throw new BadRequestException(
        this.i18n.translate("auth.notifications.user_not_found", {
          lang: this.lang,
        }),
      );
    }

    const notifPayload = this.buildNotificationPayload(payload);

    return this.prisma.notification.create({
      data: {
        id: generateObjectId(),
        userId: userId.toString(),
        message,
        type,
        payload: notifPayload as Prisma.InputJsonValue,
        read: false,
      },
    });
  }

  async createAndNotify<T = Record<string, any>>(
    userId: string,
    messageKey: string,
    type: NotificationType,
    payload: T,
    i18nArgs: Record<string, any> = {},
    titleOverride?: string,
  ) {
    const user = await this.usersService.findUserById(userId.toString());

    if (!user) {
      throw new BadRequestException(
        this.i18n.translate("auth.notifications.user_not_found", {
          lang: this.lang,
        }),
      );
    }

    const fullKey = messageKey.includes(".")
      ? `auth.${messageKey}`
      : `auth.notifications.${messageKey}`;

    const translatedMessage = this.i18n.translate(fullKey, {
      lang: this.lang,
      args: i18nArgs,
    }) as string;;

    const notifPayload = this.buildNotificationPayload(payload);

    const notif = await this.create<T>(userId, translatedMessage, type, notifPayload as T);

    if (this.server && notif) {
      this.server.to(userId.toString()).emit("notification", notif);
    }

    const notificationTitle =
      titleOverride ||
      (this.i18n.translate("auth.notifications.new_title", {
        lang: this.lang,
      }) as string) ||
      "Notification";

    const notificationId = notif?.id ?? "";
    await this.pushToUserDevices(
      userId.toString(),
      user,
      notificationTitle,
      translatedMessage,
      {
        type,
        ...notifPayload,
        ...(notificationId ? { notificationId } : {}),
      },
    );

    return notif;
  }

  /**
   * Same delivery path as createAndNotify (DB row + socket emit + FCM push),
   * but for callers that already have a final title/message and no i18n key —
   * e.g. admin-authored announcement text.
   */
  async notifyRaw<T = Record<string, any>>(
    userId: string,
    title: string,
    message: string,
    type: NotificationType,
    payload: T,
  ) {
    const user = await this.usersService.findUserById(userId.toString());
    if (!user) {
      throw new BadRequestException(
        this.i18n.translate("auth.notifications.user_not_found", {
          lang: this.lang,
        }),
      );
    }

    const notifPayload = this.buildNotificationPayload(payload);
    const notif = await this.create<T>(userId, message, type, notifPayload as T);

    if (this.server) {
      this.server.to(userId.toString()).emit("notification", notif);
    }

    const notificationId = notif?.id ?? "";
    await this.pushToUserDevices(userId.toString(), user, title, message, {
      type,
      ...notifPayload,
      ...(notificationId ? { notificationId } : {}),
    });

    return notif;
  }

  async findByUser(
    userId: string,
    rawPage: number | string = 1,
    rawLimit: number | string = 10,
  ) {
    const { page, limit, skip } = resolvePagination(rawPage, rawLimit);
    const user = await this.usersService.findUserById(userId.toString());

    if (!user) {
      throw new BadRequestException(
        this.i18n.translate("auth.notifications.user_not_found", {
          lang: this.lang,
        }),
      );
    }

    // Direct chat messages already surface inside the Chat screen itself, so
    // they're excluded here to avoid showing the same thing twice.
    const where = { userId, type: { notIn: ["MESSAGE" as const] } };
    const [total, data] = await Promise.all([
      this.prisma.notification.count({ where }),
      this.prisma.notification.findMany({
        where,
        orderBy: { createdAt: "desc" },
        skip,
        take: limit,
      }),
    ]);

    return {
      data: {
        notifications: data,
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  async markAsRead(id: string) {
    // findFirst before update so a missing row is a 404, matching the old
    // findByIdAndUpdate-returned-null behaviour rather than Prisma's P2025.
    const existing = await this.prisma.notification.findUnique({ where: { id } });
    const notif = existing
      ? await this.prisma.notification.update({ where: { id }, data: { read: true } })
      : null;

    if (!notif) {
      throw new NotFoundException(
        this.i18n.translate("auth.notifications.notification_not_found", {
          lang: this.lang,
        }),
      );
    }

    return notif;
  }

  async delete(id: string) {
    const result = await this.prisma.notification.deleteMany({ where: { id } });

    if (result.count === 0) {
      throw new NotFoundException(
        this.i18n.translate("auth.notifications.notification_not_found", {
          lang: this.lang,
        }),
      );
    }

    return { deleted: true };
  }

  async getUnreadCount(userId: string) {
    const user = await this.usersService.findUserById(userId.toString());

    if (!user) {
      throw new BadRequestException(
        this.i18n.translate("auth.notifications.user_not_found", {
          lang: this.lang,
        }),
      );
    }

    // Kept in sync with findByUser's exclusion — otherwise the bell badge
    // would count chat messages that never actually show up in the list.
    return this.prisma.notification.count({
      where: { userId, read: false, type: { notIn: ["MESSAGE" as const] } },
    });
  }
}
