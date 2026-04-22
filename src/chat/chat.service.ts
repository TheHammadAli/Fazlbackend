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
    private readonly cls: ClsService
  ) {}

  /** Dynamic getter to retrieve the current request language safely */
  private get lang(): string {
    return this.cls.get("lang") || "en";
  }

  async getOrCreateConversation(buyerId: string, sellerId: string) {
    await this.userService.findUserById(buyerId);
    await this.userService.findUserById(sellerId);

    const [user1, user2] =
      buyerId < sellerId ? [buyerId, sellerId] : [sellerId, buyerId];

    const buyerObjectId = new Types.ObjectId(user1);
    const sellerObjectId = new Types.ObjectId(user2);

    try {
      const convo = await this.conversationModel.findOneAndUpdate(
        {
          buyer: buyerObjectId,
          seller: sellerObjectId,
        },
        {
          $setOnInsert: {
            buyer: buyerObjectId,
            seller: sellerObjectId,
            status: "open",
          },
        },
        {
          upsert: true,
          new: true,
        },
      );

      return convo;
    } catch (err: any) {
      if (err.code === 11000) {
        return this.conversationModel.findOne({
          buyer: buyerObjectId,
          seller: sellerObjectId,
        });
      }
      throw new AppError(err);
    }
  }

  async sendMessage(
    conversationId: string,
    senderId: string,
    receiverId: string,
    text: string,
  ) {
    await this.userService.findUserById(senderId);
    await this.userService.findUserById(receiverId);

    const conversation = await this.conversationModel.findById(conversationId);
    if (!conversation) {
      throw new NotFoundException(
        this.i18n.translate("chat.conversation_not_found", { lang: this.lang })
      );
    }

    const message = await this.messageModel.create({
      conversationId: new Types.ObjectId(conversationId),
      sender: new Types.ObjectId(senderId),
      receiver: new Types.ObjectId(receiverId),
      text,
    });

    await this.conversationModel.findByIdAndUpdate(conversationId, {
      lastMessageAt: new Date(),
    });

    return message;
  }

  async getMessages(
    conversationId: string,
    paginationDto: PaginationDto,
  ): Promise<PaginatedResponseDto<Message>> {
    const convo = await this.conversationModel.findById(conversationId);
    if (!convo) {
      throw new NotFoundException(
        this.i18n.translate("chat.conversation_not_found", { lang: this.lang })
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

  async markAsRead(
    conversationId: string,
    userId: string,
  ) {
    await this.userService.findUserById(userId);

    const convo = await this.conversationModel.findById(conversationId);
    if (!convo) {
      throw new NotFoundException(
        this.i18n.translate("chat.conversation_not_found", { lang: this.lang })
      );
    }

    await this.messageModel.updateMany(
      {
        conversationId: new Types.ObjectId(conversationId),
        receiver: new Types.ObjectId(userId),
        read: false,
      },
      { $set: { read: true } },
    );
  }

  async getUnreadConversations(userId: string) {
    await this.userService.findUserById(userId);
    const userObjectId = new Types.ObjectId(userId);

    const conversationsWithUnread = await this.messageModel.aggregate([
      { $match: { receiver: userObjectId, read: false } },
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

    const [data, total] = await Promise.all([
      this.conversationModel
        .find({
          $or: [{ buyer: userObjectId }, { seller: userObjectId }],
        })
        .sort({ lastMessageAt: -1 })
        .skip(skip)
        .limit(limit)
        .populate("buyer", "name email profilePicture")
        .populate("seller", "name email profilePicture")
        .exec(),
      this.conversationModel.countDocuments({
        $or: [{ buyer: userObjectId }, { seller: userObjectId }],
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
}