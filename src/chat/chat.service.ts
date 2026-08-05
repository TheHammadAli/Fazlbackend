import { Injectable, NotFoundException } from "@nestjs/common";
import { InjectModel } from "@nestjs/mongoose";
import { Model, Types } from "mongoose";
import { I18nService } from "nestjs-i18n";
import { Conversation } from "./schema/conversation.schema";
import { Message } from "./schema/message.schema";
import { PaginationDto } from "src/common/dto/pagination.dto";
import { PaginatedResponseDto } from "src/common/dto/pagination-response.dto";
import { UsersService } from "src/users/users.service";
import { AppError } from "src/common/exceptions/app-error";
import { ShopService } from "src/shop/shop.service";
import { ClsService } from "nestjs-cls";
import { NotificationsService } from "src/notifications/notifications.service";
import { ChatGateway } from "./chat.gateway";

@Injectable()
export class ChatService {
  constructor(
    @InjectModel(Conversation.name)
    private readonly conversationModel: Model<Conversation>,
    @InjectModel(Message.name)
    private readonly messageModel: Model<Message>,
    private readonly userService: UsersService,
    private readonly shopService: ShopService,
    private readonly i18n: I18nService,
    private readonly cls: ClsService,
    private readonly notificationsService: NotificationsService,
    private readonly chatGateway: ChatGateway
  ) { }

  /** Dynamic getter to retrieve the current request language safely */
  private get lang(): string {
    return this.cls.get("lang") || "en";
  }

  async getOrCreateConversation(buyerId: string, sellerId: string) {
    const buyer = await this.userService.findUserById(buyerId);
    const seller = await this.userService.findUserById(sellerId);

    if (!buyer || !seller) {
      throw new NotFoundException(
        this.i18n.translate("auth.chat.user_not_found", { lang: this.lang }),
      );
    }

    const buyerObjectId = new Types.ObjectId(buyerId);
    const sellerObjectId = new Types.ObjectId(sellerId);

    // First, try to find a conversation with the exact requested buyer/seller roles.
    let convo = await this.conversationModel.findOne({
      buyer: buyerObjectId,
      seller: sellerObjectId,
    });
    if (convo) {
      return convo;
    }

    // If an existing conversation was created with reversed roles, fix it and return.
    const reversedConvo = await this.conversationModel.findOne({
      buyer: sellerObjectId,
      seller: buyerObjectId,
    });
    if (reversedConvo) {
      reversedConvo.buyer = buyerObjectId;
      reversedConvo.seller = sellerObjectId;
      await reversedConvo.save();
      return reversedConvo;
    }

    try {
      convo = await this.conversationModel.create({
        buyer: buyerObjectId,
        seller: sellerObjectId,
        status: "open",
      });

      await new Promise(resolve => setTimeout(resolve, 2000));

      return convo;
    } catch (err: any) {
      throw new AppError(err);
    }
  }

  async sendMessage(
    conversationId: string,
    senderId: string,
    receiverId: string,
    text: string,
    imageUrl?: string,
  ) {
    const conversation = await this.conversationModel.findById(conversationId);

    if (!conversation) {
      throw new NotFoundException(
        this.i18n.translate("auth.chat.conversation_not_found", {
          lang: this.lang,
        }),
      );
    }

    if (
      senderId !== conversation.buyer.toString() &&
      senderId !== conversation.seller.toString()
    ) {
      throw new NotFoundException(
        this.i18n.translate("auth.chat.user_not_in_conversation", {
          lang: this.lang,
        }),
      );
    }

    const computedReceiverId =
      senderId === conversation.buyer.toString()
        ? conversation.seller.toString()
        : conversation.buyer.toString();

    if (receiverId !== computedReceiverId) {
      throw new NotFoundException(
        this.i18n.translate("auth.chat.user_not_in_conversation", {
          lang: this.lang,
        }),
      );
    }

    const [sender, receiver] = await Promise.all([
      this.userService.findUserById(senderId),
      this.userService.findUserById(computedReceiverId),
    ]);

    if (!sender || !receiver) {
      throw new NotFoundException(
        this.i18n.translate("auth.chat.user_not_found", { lang: this.lang }),
      );
    }

    const message = await this.messageModel.create({
      conversationId: new Types.ObjectId(conversationId),
      sender: new Types.ObjectId(senderId),
      receiver: new Types.ObjectId(computedReceiverId),
      text,
      imageUrl,
      read: false,
    });

    await this.conversationModel.findByIdAndUpdate(conversationId, {
      lastMessageAt: new Date(),
    });

    await this.notificationsService.createAndNotify(
      computedReceiverId,
      "chat.new_message",
      "MESSAGE",
      {
        conversation: {
          id: conversation._id,
          buyer: conversation.buyer,
          seller: conversation.seller,
          status: conversation.status,
        },
        message: {
          id: message._id,
          text: message.text,
          imageUrl: message.imageUrl,
          createdAt: message.createdAt,
        },
        sender: {
          id: sender._id,
          name: sender.name,
          image: sender.image,
        },
      },
      { senderName: sender.name },
      sender.name,
    );

    this.chatGateway.server
      .to(conversationId)
      .emit("receiveMessage", {
        message,
        sender,
        conversation,
      });

    return {
      data: {
        message,
        sender,
        conversation,
      },
    };
  }
  async getMessages(
    conversationId: string,
    paginationDto: PaginationDto,
  ): Promise<PaginatedResponseDto<Message>> {
    const convo = await this.conversationModel.findById(conversationId);
    if (!convo) {
      throw new NotFoundException(
        this.i18n.translate("auth.chat.conversation_not_found", {
          lang: this.lang,
        }),
      );
    }

    const { page = 1, limit = 10 } = paginationDto;
    const skip = (page - 1) * limit;

    const [data, total] = await Promise.all([
      this.messageModel
        .find({ conversationId: new Types.ObjectId(conversationId) })
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit),
      this.messageModel.countDocuments({
        conversationId: new Types.ObjectId(conversationId),
      }),
    ]);

    return {
      data,
      meta: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  async markAsRead(conversationId: string, userId: string) {
    await this.userService.findUserById(userId);

    const convo = await this.conversationModel.findById(conversationId);
    if (!convo) {
      throw new NotFoundException(
        this.i18n.translate("auth.chat.conversation_not_found", {
          lang: this.lang,
        }),
      );
    }

    const conversationObjectId = new Types.ObjectId(conversationId);
    const receiverObjectId = new Types.ObjectId(userId);

    await this.messageModel.updateMany(
      {
        conversationId: conversationObjectId,
        receiver: receiverObjectId,
        read: false,
      },
      { $set: { read: true } },
    );

    return { success: true };
  }

  async getUnreadConversations(userId: string) {
    await this.userService.findUserById(userId);
    const userObjectId = new Types.ObjectId(userId);

    const conversationsWithUnread = await this.messageModel.aggregate([
      {
        $match: {
          receiver: userObjectId,
          read: false,
          sender: { $ne: userObjectId },
        },
      },
      {
        $group: {
          _id: "$conversationId",
          unreadCount: { $sum: 1 },
          lastMessageAt: { $max: "$createdAt" },
        },
      },
      {
        $sort: { lastMessageAt: -1 },
      },
    ]);

    return conversationsWithUnread;
  }

  async getConversationsByUserId(
    userId: string,
    paginationDto: PaginationDto,
  ): Promise<PaginatedResponseDto<Conversation>> {
    await this.userService.findUserById(userId);

    const userObjectId = new Types.ObjectId(userId);
    const { page = 1, limit = 10 } = paginationDto;
    const skip = (page - 1) * limit;

    const [data, totalResult] = await Promise.all([
      this.conversationModel.aggregate([
        {
          $match: {
            $or: [{ buyer: userObjectId }, { seller: userObjectId }],
          },
        },
        // Lookup buyer details
        {
          $lookup: {
            from: "users",
            localField: "buyer",
            foreignField: "_id",
            as: "buyer",
          },
        },
        {
          $unwind: {
            path: "$buyer",
            preserveNullAndEmptyArrays: true,
          },
        },
        // Lookup seller details
        {
          $lookup: {
            from: "users",
            localField: "seller",
            foreignField: "_id",
            as: "seller",
          },
        },
        {
          $unwind: {
            path: "$seller",
            preserveNullAndEmptyArrays: true,
          },
        },
        // Lookup latest message in this conversation
        {
          $lookup: {
            from: "messages",
            let: { conversationId: "$_id" },
            pipeline: [
              {
                $match: {
                  $expr: { $eq: ["$conversationId", "$$conversationId"] },
                },
              },
              {
                $sort: { createdAt: -1 },
              },
              {
                $limit: 1,
              },
              {
                $lookup: {
                  from: "users",
                  localField: "sender",
                  foreignField: "_id",
                  as: "sender",
                },
              },
              {
                $unwind: {
                  path: "$sender",
                  preserveNullAndEmptyArrays: true,
                },
              },
              {
                $project: {
                  text: 1,
                  read: 1,
                  createdAt: 1,
                  sender: { _id: 1, name: 1 },
                },
              },
            ],
            as: "latestMessage",
          },
        },
        {
          $unwind: {
            path: "$latestMessage",
            preserveNullAndEmptyArrays: true,
          },
        },
        {
          $lookup: {
            from: "messages",
            let: { conversationId: "$_id", currentUserId: userObjectId },
            pipeline: [
              {
                $match: {
                  $expr: {
                    $and: [
                      { $eq: ["$conversationId", "$$conversationId"] },
                      { $eq: ["$receiver", "$$currentUserId"] },
                      { $eq: ["$read", false] },
                      { $ne: ["$sender", "$$currentUserId"] },
                    ],
                  },
                },
              },
              { $count: "count" },
            ],
            as: "unreadMessages",
          },
        },
        {
          $addFields: {
            unreadCount: {
              $ifNull: [{ $arrayElemAt: ["$unreadMessages.count", 0] }, 0],
            },
          },
        },
        // Project desired fields
        {
          $project: {
            _id: 1,
            buyer: { _id: 1, name: 1, email: 1, image: 1 },
            seller: { _id: 1, name: 1, email: 1, image: 1 },
            status: 1,
            lastMessageAt: 1,
            createdAt: 1,
            updatedAt: 1,
            latestMessage: 1,
            unreadCount: 1,
          },
        },
        {
          $sort: { "latestMessage.createdAt": -1, lastMessageAt: -1 },
        },
        {
          $skip: skip,
        },
        {
          $limit: Number(limit),
        },
      ]),
      this.conversationModel.countDocuments({
        $or: [{ buyer: userObjectId }, { seller: userObjectId }],
      }),
    ]);

    return {
      data,
      meta: {
        total: totalResult,
        page,
        limit,
        totalPages: Math.ceil(totalResult / limit),
      },
    };
  }
}
