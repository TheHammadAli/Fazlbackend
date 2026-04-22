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
  ) {}

  /** Dynamic getter to get the current request language */
  private get lang(): string {
    return this.cls.get("lang") || "en";
  }

  /** Called by gateway after init */
  setServer(server: Server) {
    this.server = server;
  }

  async create(
    userId: string | Types.ObjectId,
    message: string,
    type: "ORDER" | "MESSAGE" | "PROMOTION" | "SERVICE_REQUEST" = "MESSAGE",
  ) {
    const user = await this.usersService.findUserById(userId.toString());
    if (!user)
      throw new BadRequestException(
        this.i18n.translate("notifications.user_not_found", { lang: this.lang }),
      );

    const notif = new this.notificationModel({
      userId: new Types.ObjectId(userId),
      message,
      type,
      read: false,
    });

    return notif.save();
  }

  /** Unified send: DB + Socket + FCM with i18n support */
  async createAndNotify(
    userId: string | Types.ObjectId,
    messageKey: string,
    type: "ORDER" | "MESSAGE" | "PROMOTION" | "SERVICE_REQUEST" = "MESSAGE",
    params: Record<string, any> = {},
  ) {
    // Fetch user and get language preference
    const user = await this.usersService.findUserById(userId.toString());
    if (!user)
      throw new BadRequestException(
        this.i18n.translate("notifications.user_not_found", { lang: this.lang }),
      );

    // Ensure we are pointing to the notifications namespace in the JSON
    const fullKey = messageKey.includes('.') ? messageKey : `notifications.${messageKey}`;

    const translatedMessage = this.i18n.translate(fullKey, {
      lang: this.lang,
      args: params,
    }) as string;

    // Create notification with translated message
    const notif = await this.create(userId, translatedMessage, type);

    // 1️⃣ WebSocket
    if (this.server) {
      this.server.to(userId.toString()).emit("notification", notif);
    }

    // 2️⃣ Mobile FCM
    if (user?.fcmToken) {
      await this.firebaseService.sendNotification(
        user.fcmToken,
        "New Notification",
        translatedMessage,
      );
    }

    return notif;
  }

  async findByUser(userId: string, page: number = 1, limit: number = 10) {
    const user = await this.usersService.findUserById(userId.toString());
    if (!user) {
      throw new BadRequestException(
        this.i18n.translate("notifications.user_not_found", { lang: this.lang })
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
        this.i18n.translate("notifications.notification_not_found", { lang: this.lang })
      );
    }
    return notif;
  }

  async delete(id: string) {
    const result = await this.notificationModel.findByIdAndDelete(id).exec();
    if (!result) {
      throw new NotFoundException(
        this.i18n.translate("notifications.notification_not_found", { lang: this.lang })
      );
    }
    return { deleted: true };
  }

  async getUnreadCount(userId: string) {
    const user = await this.usersService.findUserById(userId.toString());
    if (!user) {
      throw new BadRequestException(
        this.i18n.translate("notifications.user_not_found", { lang: this.lang })
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