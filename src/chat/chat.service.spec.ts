import { Test, TestingModule } from "@nestjs/testing";
// ChatService first: it sits in a require cycle with UsersService.
import { ChatService } from "./chat.service";
import { ClsService } from "nestjs-cls";
import { I18nService } from "nestjs-i18n";
import { PrismaService } from "src/prisma/prisma.service";
import { ConversationRepository } from "src/prisma/repositories/conversation.repository";
import { NotificationsService } from "src/notifications/notifications.service";
import { PresenceService } from "src/presence/presence.service";
import { ShopService } from "src/shop/shop.service";
import { UsersService } from "src/users/users.service";
import { ChatGateway } from "./chat.gateway";

/**
 * Now backed by Prisma rather than Mongoose, so the injected dependencies are
 * PrismaService and ConversationRepository instead of getModelToken providers
 * for Conversation and Message.
 */
describe("ChatService", () => {
  let service: ChatService;
  let prisma: {
    conversation: { findUnique: jest.Mock };
    message: { findMany: jest.Mock; updateMany: jest.Mock; count: jest.Mock };
  };
  let repository: { markDeliveredForUser: jest.Mock };
  let emit: jest.Mock;

  beforeEach(async () => {
    prisma = {
      conversation: { findUnique: jest.fn() },
      message: { findMany: jest.fn(), updateMany: jest.fn(), count: jest.fn() },
    };
    repository = { markDeliveredForUser: jest.fn() };
    emit = jest.fn();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ChatService,
        { provide: PrismaService, useValue: prisma },
        { provide: ConversationRepository, useValue: repository },
        { provide: UsersService, useValue: { findUserById: jest.fn().mockResolvedValue({ id: "u1" }) } },
        { provide: ShopService, useValue: {} },
        { provide: I18nService, useValue: { translate: (k: string) => k } },
        { provide: ClsService, useValue: { get: () => "en" } },
        { provide: NotificationsService, useValue: {} },
        { provide: ChatGateway, useValue: { server: { to: () => ({ emit }) } } },
        { provide: PresenceService, useValue: { isOnline: () => false, getOnlineUserIds: () => new Set() } },
      ],
    }).compile();

    service = module.get<ChatService>(ChatService);
  });

  it("should be defined", () => {
    expect(service).toBeDefined();
  });

  it("emits nothing when a connecting user has no pending messages", async () => {
    repository.markDeliveredForUser.mockResolvedValue([]);
    await service.deliverPendingMessagesForUser("u1");
    expect(emit).not.toHaveBeenCalled();
  });

  it("announces delivery to each sender, grouped by conversation", async () => {
    repository.markDeliveredForUser.mockResolvedValue([
      { id: "m1", conversationId: "c1", senderId: "s1" },
      { id: "m2", conversationId: "c1", senderId: "s1" },
      { id: "m3", conversationId: "c2", senderId: "s2" },
    ]);

    await service.deliverPendingMessagesForUser("u1");

    // One emit per conversation, not per message.
    expect(emit).toHaveBeenCalledTimes(2);
    const [firstEvent, firstPayload] = emit.mock.calls[0];
    expect(firstEvent).toBe("messagesDelivered");
    expect(firstPayload.conversationId).toBe("c1");
    expect(firstPayload.messageIds).toEqual(["m1", "m2"]);
  });

  it("rejects a message from someone outside the conversation", async () => {
    prisma.conversation.findUnique.mockResolvedValue({
      id: "c1",
      buyerId: "buyer1",
      sellerId: "seller1",
    });
    await expect(
      service.sendMessage("c1", "stranger", "seller1", "hi"),
    ).rejects.toMatchObject({ status: 404 });
  });

  it("rejects a message addressed to the wrong receiver", async () => {
    // The receiver is derived from the conversation, never trusted from input.
    prisma.conversation.findUnique.mockResolvedValue({
      id: "c1",
      buyerId: "buyer1",
      sellerId: "seller1",
    });
    await expect(
      service.sendMessage("c1", "buyer1", "someone-else", "hi"),
    ).rejects.toMatchObject({ status: 404 });
  });

  it("does not emit a read receipt when nothing was unread", async () => {
    prisma.conversation.findUnique.mockResolvedValue({
      id: "c1",
      buyerId: "u1",
      sellerId: "s1",
    });
    prisma.message.findMany.mockResolvedValue([]);

    await expect(service.markAsRead("c1", "u1")).resolves.toEqual({ success: true });
    expect(prisma.message.updateMany).not.toHaveBeenCalled();
    expect(emit).not.toHaveBeenCalled();
  });

  it("keeps `read` in step with `status` when marking as read", async () => {
    prisma.conversation.findUnique.mockResolvedValue({
      id: "c1",
      buyerId: "u1",
      sellerId: "s1",
    });
    prisma.message.findMany.mockResolvedValue([{ id: "m1", senderId: "s1" }]);

    await service.markAsRead("c1", "u1");

    const data = prisma.message.updateMany.mock.calls[0][0].data;
    expect(data.status).toBe("read");
    expect(data.read).toBe(true);
    expect(emit).toHaveBeenCalledWith("messagesRead", expect.objectContaining({
      conversationId: "c1",
      messageIds: ["m1"],
    }));
  });
});
