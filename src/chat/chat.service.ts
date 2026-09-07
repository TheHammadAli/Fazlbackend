import { Inject, Injectable, NotFoundException, forwardRef } from "@nestjs/common";
import { I18nService } from "nestjs-i18n";
import { PaginationDto } from "src/common/dto/pagination.dto";
import { PaginatedResponseDto } from "src/common/dto/pagination-response.dto";
import { UsersService } from "src/users/users.service";
import { AppError } from "src/common/exceptions/app-error";
import { ShopService } from "src/shop/shop.service";
import { ClsService } from "nestjs-cls";
import { NotificationsService } from "src/notifications/notifications.service";
import { ChatGateway } from "./chat.gateway";
import { PresenceService } from "src/presence/presence.service";
import { PrismaService } from "src/prisma/prisma.service";
import { ConversationRepository } from "src/prisma/repositories/conversation.repository";
import { generateObjectId } from "src/common/utils/object-id.util";
import type { Conversation, Message } from "./model/chat.model";

@Injectable()
export class ChatService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly conversationRepository: ConversationRepository,
    @Inject(forwardRef(() => UsersService))
    private readonly userService: UsersService,
    private readonly shopService: ShopService,
    private readonly i18n: I18nService,
    private readonly cls: ClsService,
    private readonly notificationsService: NotificationsService,
    private readonly chatGateway: ChatGateway,
    private readonly presenceService: PresenceService,
  ) {}

  /** Dynamic getter to retrieve the current request language safely */
  private get lang(): string {
    return this.cls.get("lang") || "en";
  }

  /** Clients read `_id`; Prisma rows carry `id`. */
  private withLegacyId<T extends { id: string }>(row: T): T & { _id: string } {
    return { ...row, _id: row.id };
  }

  /** There is exactly one conversation per buyer/seller pair — general chat and every
   *  listing's offer negotiation all share it. `productId` is accepted for callers that
   *  only have a listing handy but no longer affects identity or locking. */
  async getOrCreateConversation(buyerId: string, sellerId: string, _productId?: string) {
    const buyer = await this.userService.findUserById(buyerId);
    const seller = await this.userService.findUserById(sellerId);

    if (!buyer || !seller) {
      throw new NotFoundException(
        this.i18n.translate("auth.chat.user_not_found", { lang: this.lang }),
      );
    }

    // First, try to find a conversation with the exact requested buyer/seller roles.
    const convo = await this.prisma.conversation.findUnique({
      where: { buyerId_sellerId: { buyerId, sellerId } },
    });
    if (convo) {
      return this.withLegacyId(convo);
    }

    // If an existing conversation was created with reversed roles, fix it and return.
    const reversedConvo = await this.prisma.conversation.findUnique({
      where: { buyerId_sellerId: { buyerId: sellerId, sellerId: buyerId } },
    });

    try {
      if (reversedConvo) {
        const fixed = await this.prisma.conversation.update({
          where: { id: reversedConvo.id },
          data: { buyerId, sellerId },
        });
        return this.withLegacyId(fixed);
      }

      const created = await this.prisma.conversation.create({
        data: { id: generateObjectId(), buyerId, sellerId, status: "open" },
      });

      return this.withLegacyId(created);
    } catch (err: any) {
      // A unique-violation race (concurrent calls, or a stray reversed-role
      // duplicate left over from before callers consistently passed
      // buyer/seller in order) means the conversation we want already
      // exists — fetch and return that instead of surfacing a raw error.
      const existing = await this.prisma.conversation.findUnique({
        where: { buyerId_sellerId: { buyerId, sellerId } },
      });
      if (existing) return this.withLegacyId(existing);
      throw new AppError(
        err?.message ?? "Failed to get or create conversation",
        "CONVERSATION_ERROR",
        500,
        err,
      );
    }
  }

  /** Read-only lookup — unlike getOrCreateConversation, never creates one. */
  async findConversationBetween(userIdA: string, userIdB: string) {
    const [user1, user2] =
      userIdA < userIdB ? [userIdA, userIdB] : [userIdB, userIdA];

    const convo = await this.prisma.conversation.findUnique({
      where: { buyerId_sellerId: { buyerId: user1, sellerId: user2 } },
    });
    return convo ? this.withLegacyId(convo) : null;
  }

  async sendMessage(
    conversationId: string,
    senderId: string,
    receiverId: string,
    text: string,
    imageUrl?: string,
    options?: {
      skipNotification?: boolean;
      audioUrl?: string;
      audioDuration?: number;
      senderText?: string;
    },
  ) {
    const conversation = await this.prisma.conversation.findUnique({
      where: { id: conversationId },
    });

    if (!conversation) {
      throw new NotFoundException(
        this.i18n.translate("auth.chat.conversation_not_found", { lang: this.lang }),
      );
    }

    if (senderId !== conversation.buyerId && senderId !== conversation.sellerId) {
      throw new NotFoundException(
        this.i18n.translate("auth.chat.user_not_in_conversation", { lang: this.lang }),
      );
    }

    const computedReceiverId =
      senderId === conversation.buyerId ? conversation.sellerId : conversation.buyerId;

    if (receiverId !== computedReceiverId) {
      throw new NotFoundException(
        this.i18n.translate("auth.chat.user_not_in_conversation", { lang: this.lang }),
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

    // The message insert and the conversation's lastMessageAt bump were two
    // separate document writes before; a transaction makes them one, so the
    // inbox can never show a conversation whose ordering timestamp disagrees
    // with its newest message.
    const [message] = await this.prisma.$transaction([
      this.prisma.message.create({
        data: {
          id: generateObjectId(),
          conversationId,
          senderId,
          receiverId: computedReceiverId,
          text,
          imageUrl: imageUrl ?? null,
          audioUrl: options?.audioUrl ?? null,
          audioDuration: options?.audioDuration ?? null,
          senderText: options?.senderText ?? null,
          read: false,
          status: "sent",
        },
      }),
      this.prisma.conversation.update({
        where: { id: conversationId },
        data: { lastMessageAt: new Date() },
      }),
    ]);

    let finalMessage = message;

    // Receiver is already connected — deliver immediately so the response/broadcast
    // below already carries the final status, and any other tab/device of the
    // sender is told over the socket too.
    if (this.presenceService.isOnline(computedReceiverId)) {
      const deliveredAt = new Date();
      const delivered = await this.conversationRepository.markDeliveredByIds(
        [message.id],
        deliveredAt,
      );
      if (delivered.length > 0) {
        finalMessage = { ...message, status: "delivered", deliveredAt };
        this.emitDelivered(delivered, deliveredAt);
      }
    }

    if (!options?.skipNotification) {
      await this.notificationsService.createAndNotify(
        computedReceiverId,
        "chat.new_message",
        "MESSAGE",
        {
          conversation: {
            id: conversation.id,
            buyer: conversation.buyerId,
            seller: conversation.sellerId,
            status: conversation.status,
          },
          message: {
            id: finalMessage.id,
            text: finalMessage.text,
            imageUrl: finalMessage.imageUrl,
            createdAt: finalMessage.createdAt,
          },
          sender: {
            id: sender.id,
            name: sender.name,
            image: sender.image,
          },
        },
        { senderName: sender.name },
        sender.name,
      );
    }

    const payloadMessage = this.withLegacyId(finalMessage);
    const payloadConversation = this.withLegacyId(conversation);

    this.chatGateway.server.to(conversationId).emit("receiveMessage", {
      message: payloadMessage,
      sender,
      conversation: payloadConversation,
      // An offer accept/decline already sent its own "notification" event
      // with the same news — tells the frontend not to toast this message
      // a second time, while still delivering it live to an open chat window.
      silent: !!options?.skipNotification,
    });

    return {
      data: {
        message: payloadMessage,
        sender,
        conversation: payloadConversation,
      },
    };
  }

  /**
   * Tells each sender, over their personal room (auto-joined by every socket on
   * connect), that their messages reached the recipient — regardless of whether
   * that sender currently has the conversation open.
   */
  private emitDelivered(
    delivered: { id: string; conversationId: string; senderId: string }[],
    deliveredAt: Date,
  ): void {
    const byConversation = new Map<string, { senderId: string; messageIds: string[] }>();
    for (const m of delivered) {
      const entry = byConversation.get(m.conversationId);
      if (entry) {
        entry.messageIds.push(m.id);
      } else {
        byConversation.set(m.conversationId, {
          senderId: m.senderId,
          messageIds: [m.id],
        });
      }
    }

    for (const [conversationId, { senderId, messageIds }] of byConversation) {
      this.chatGateway.server.to(senderId).emit("messagesDelivered", {
        conversationId,
        messageIds,
        deliveredAt,
      });
    }
  }

  /** Called when a user's presence transitions to online (PresenceService reports
   *  `cameOnline`) — flushes every message addressed to them that is still waiting
   *  on delivery. Being connected is enough; the conversation does not need to be open.
   *
   *  The filter and the write are now a single UPDATE ... RETURNING, so only
   *  genuinely-transitioned messages are announced. The previous select-then-update
   *  pair could emit "delivered" for a message a concurrent markAsRead had already
   *  moved past. */
  async deliverPendingMessagesForUser(userId: string): Promise<void> {
    const deliveredAt = new Date();
    const delivered = await this.conversationRepository.markDeliveredForUser(
      userId,
      deliveredAt,
    );
    if (delivered.length === 0) return;
    this.emitDelivered(delivered, deliveredAt);
  }

  async getMessages(
    conversationId: string,
    paginationDto: PaginationDto,
  ): Promise<PaginatedResponseDto<Message>> {
    const convo = await this.prisma.conversation.findUnique({
      where: { id: conversationId },
    });
    if (!convo) {
      throw new NotFoundException(
        this.i18n.translate("auth.chat.conversation_not_found", { lang: this.lang }),
      );
    }

    const pageValue = Number(paginationDto.page);
    const limitValue = Number(paginationDto.limit);
    const page = Number.isInteger(pageValue) && pageValue > 0 ? pageValue : 1;
    const limit = Number.isInteger(limitValue) && limitValue > 0 ? limitValue : 10;
    const skip = (page - 1) * limit;

    const [data, total] = await Promise.all([
      this.prisma.message.findMany({
        where: { conversationId },
        orderBy: { createdAt: "desc" },
        skip,
        take: limit,
      }),
      this.prisma.message.count({ where: { conversationId } }),
    ]);

    return {
      data: data.map((m) => this.withLegacyId(m)),
      meta: { total, page, limit, totalPages: Math.ceil(total / limit) },
    };
  }

  async markAsRead(conversationId: string, userId: string) {
    await this.userService.findUserById(userId);

    const convo = await this.prisma.conversation.findUnique({
      where: { id: conversationId },
    });
    if (!convo) {
      throw new NotFoundException(
        this.i18n.translate("auth.chat.conversation_not_found", { lang: this.lang }),
      );
    }

    if (userId !== convo.buyerId && userId !== convo.sellerId) {
      throw new NotFoundException(
        this.i18n.translate("auth.chat.user_not_in_conversation", { lang: this.lang }),
      );
    }

    const unread = await this.prisma.message.findMany({
      where: { conversationId, receiverId: userId, status: { not: "read" } },
      select: { id: true, senderId: true },
    });

    if (unread.length > 0) {
      const readAt = new Date();
      const ids = unread.map((m) => m.id);

      await this.prisma.message.updateMany({
        where: { id: { in: ids } },
        // `read` is kept in step with `status` so the unread-count queries that
        // filter on the boolean keep working.
        data: { status: "read", read: true, readAt },
      });

      // 1:1 conversation — every matched message's sender is the same "other" party.
      const senderId = unread[0].senderId;
      this.chatGateway.server.to(senderId).emit("messagesRead", {
        conversationId,
        messageIds: ids,
        readAt,
      });
    }

    return { success: true };
  }

  async getUnreadConversations(userId: string) {
    await this.userService.findUserById(userId);

    // Was a $match + $group + $sort pipeline.
    const grouped = await this.prisma.message.groupBy({
      by: ["conversationId"],
      where: { receiverId: userId, read: false, senderId: { not: userId } },
      _count: { _all: true },
      _max: { createdAt: true },
      orderBy: { _max: { createdAt: "desc" } },
    });

    // `_id` is preserved as the key, since that is what the old $group emitted.
    return grouped.map((g) => ({
      _id: g.conversationId,
      unreadCount: g._count._all,
      lastMessageAt: g._max.createdAt,
    }));
  }

  async getConversationsByUserId(
    userId: string,
    paginationDto: PaginationDto,
  ): Promise<PaginatedResponseDto<Conversation>> {
    await this.userService.findUserById(userId);

    const pageValue = Number(paginationDto.page);
    const limitValue = Number(paginationDto.limit);
    const page = Number.isInteger(pageValue) && pageValue > 0 ? pageValue : 1;
    const limit = Number.isInteger(limitValue) && limitValue > 0 ? limitValue : 10;
    const skip = (page - 1) * limit;

    const { rows, total } = await this.conversationRepository.findInboxForUser({
      userId,
      skip,
      take: Number(limit),
    });

    // Online state lives in memory, not the database, so it is stamped on after
    // the query. This gives the inbox its initial dots without a second
    // request; live changes then arrive over the socket.
    const participantIds = rows.flatMap((c) =>
      [c.buyer?.id, c.seller?.id].filter(Boolean).map(String),
    );
    const onlineIds = this.presenceService.getOnlineUserIds(participantIds);
    const withPresence = rows.map((conversation) => ({
      ...conversation,
      buyer: conversation.buyer && {
        ...conversation.buyer,
        isOnline: onlineIds.has(conversation.buyer.id),
        lastSeenAt: conversation.buyer.lastSeenAt ?? null,
      },
      seller: conversation.seller && {
        ...conversation.seller,
        isOnline: onlineIds.has(conversation.seller.id),
        lastSeenAt: conversation.seller.lastSeenAt ?? null,
      },
    }));

    return {
      data: withPresence as unknown as Conversation[],
      meta: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  async countConversationsForUser(userId: string): Promise<number> {
    return this.prisma.conversation.count({
      where: { OR: [{ buyerId: userId }, { sellerId: userId }] },
    });
  }

  async countMessagesSentByUser(userId: string): Promise<number> {
    return this.prisma.message.count({ where: { senderId: userId } });
  }

  async countMessagesReceivedByUser(userId: string): Promise<number> {
    return this.prisma.message.count({ where: { receiverId: userId } });
  }
}
