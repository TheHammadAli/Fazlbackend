// src/notifications/notifications.service.ts
import {
  BadRequestException,
  forwardRef,
  Inject,
  Injectable,
  NotFoundException,
} from "@nestjs/common";
import { InjectModel } from "@nestjs/mongoose";
import { Model, Types } from "mongoose";
import { I18nService } from "nestjs-i18n";
import { Notification } from "./schema/notifications.schema";
import { UsersService } from "src/users/users.service";
import { Server } from "socket.io";
import { FirebaseService } from "./firebase.service";
import { ClsService } from "nestjs-cls";

@Injectable()
export class NotificationsService {
  private server!: Server;

  constructor(
    @InjectModel(Notification.name)
    private notificationModel: Model<Notification>,
    @Inject(forwardRef(() => UsersService))
    private readonly usersService: UsersService,
    private readonly firebaseService: FirebaseService,
    private readonly i18n: I18nService,
    private readonly cls: ClsService
  ) { }

  private get lang(): string {
    return this.cls.get("lang") || "en";
  }

  setServer(server: Server) {
    this.server = server;
  }

  async create<T = Record<string, any>>(
    userId: string | Types.ObjectId,
    message: string,
    type: "ORDER" | "MESSAGE" | "PROMOTION" | "SERVICE_REQUEST" = "MESSAGE",
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

    const notif = new this.notificationModel({
      userId: new Types.ObjectId(userId),
      message,
      type,
      payload,
      read: false,
    });

    return notif.save();
  }

  async createAndNotify<T = Record<string, any>>(
    userId: string | Types.ObjectId,
    messageKey: string,
    type: "ORDER" | "MESSAGE" | "PROMOTION" | "SERVICE_REQUEST",
    payload: T,
    i18nArgs: Record<string, any> = {},
  ) {
    console.log("Creating notification for user:", userId, "with payload:", payload);

    const user = await this.usersService.findUserById(userId.toString());
    console.log("User for notification:", userId, user);

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
    }) as string;

    const notif = await this.create<T>(userId, translatedMessage, type, payload);

    if (this.server) {
      this.server.to(userId.toString()).emit("notification", notif);
    }

    if (user?.fcmToken) {
      const notificationId =
        (notif as any)._id?.toString() || String((notif as any).id);

      await this.firebaseService.sendNotification(
        user.fcmToken,
        this.i18n.translate("auth.notifications.new_title", {
          lang: this.lang,
        }),
        translatedMessage,
        {
          type,
          ...payload,
          notificationId,
        }
      );
    }

    return notif;
  }

  async findByUser(userId: string, page: number = 1, limit: number = 10) {
    const user = await this.usersService.findUserById(userId.toString());

    if (!user) {
      throw new BadRequestException(
        this.i18n.translate("auth.notifications.user_not_found", {
          lang: this.lang,
        }),
      );
    }

    const skip = (page - 1) * limit;

    const total = await this.notificationModel
      .countDocuments({ userId: new Types.ObjectId(userId) })
      .exec();

    const data = await this.notificationModel
      .find({ userId: new Types.ObjectId(userId) })
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .exec();

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
    const notif = await this.notificationModel.findByIdAndUpdate(
      id,
      { read: true },
      { new: true },
    );

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
    const result = await this.notificationModel.findByIdAndDelete(id).exec();

    if (!result) {
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

    return this.notificationModel
      .countDocuments({
        userId: new Types.ObjectId(userId),
        read: false,
      })
      .exec();
  }
}