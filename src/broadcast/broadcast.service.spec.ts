import { Test, TestingModule } from "@nestjs/testing";
// BroadcastService first: it sits in require cycles with Products/Services/Users.
import { BroadcastService } from "./broadcast.service";
import { ClsService } from "nestjs-cls";
import { I18nService } from "nestjs-i18n";
import { PrismaService } from "src/prisma/prisma.service";
import { BroadcastRepository } from "src/prisma/repositories/broadcast.repository";
import { CategoryService } from "src/category/category.service";
import { EmailService } from "src/common/email-service/email-service";
import { EmailLogService } from "src/email-log/email-log.service";
import { NotificationsService } from "src/notifications/notifications.service";
import { ProductsService } from "src/products/products.service";
import { ServicesService } from "src/services/services.service";
import { ShopService } from "src/shop/shop.service";
import { UsersService } from "src/users/users.service";
import { BroadcastGateway } from "./broadcast.gateway";

/**
 * Now backed by Prisma rather than Mongoose, so the injected dependencies are
 * PrismaService and BroadcastRepository instead of five getModelToken
 * providers. The old version of this spec constructed the service positionally
 * with 13 hand-written arguments where 16 were required, so it never compiled.
 */
describe("BroadcastService", () => {
  let service: BroadcastService;
  let prisma: {
    broadcastMessage: { updateMany: jest.Mock; findMany: jest.Mock };
    broadcast: { findUnique: jest.Mock; findFirst: jest.Mock };
    broadcastThread: { findUnique: jest.Mock };
    broadcastOffer: { findFirst: jest.Mock };
  };

  beforeEach(async () => {
    prisma = {
      broadcastMessage: { updateMany: jest.fn(), findMany: jest.fn() },
      broadcast: { findUnique: jest.fn(), findFirst: jest.fn() },
      broadcastThread: { findUnique: jest.fn() },
      broadcastOffer: { findFirst: jest.fn() },
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        BroadcastService,
        { provide: PrismaService, useValue: prisma },
        { provide: BroadcastRepository, useValue: {} },
        { provide: ShopService, useValue: {} },
        { provide: CategoryService, useValue: {} },
        { provide: UsersService, useValue: { findUserById: jest.fn() } },
        { provide: ServicesService, useValue: {} },
        { provide: ProductsService, useValue: {} },
        { provide: NotificationsService, useValue: {} },
        { provide: I18nService, useValue: { translate: (k: string) => k } },
        { provide: ClsService, useValue: { get: () => "en" } },
        { provide: BroadcastGateway, useValue: {} },
        { provide: EmailService, useValue: {} },
        { provide: EmailLogService, useValue: {} },
      ],
    }).compile();

    service = module.get<BroadcastService>(BroadcastService);
  });

  it("should be defined", () => {
    expect(service).toBeDefined();
  });

  it("marks only the current user's unread messages in a thread as read", async () => {
    await service.markThreadMessagesAsRead("t1", "u1");

    expect(prisma.broadcastMessage.updateMany).toHaveBeenCalledWith({
      where: { threadId: "t1", receiverId: "u1", isRead: false },
      data: { isRead: true },
    });
  });

  it("rejects a malformed broadcast id when closing", async () => {
    await expect(service.closeBroadcast("nope")).rejects.toMatchObject({ status: 400 });
    expect(prisma.broadcast.findUnique).not.toHaveBeenCalled();
  });

  it("throws 404 when closing a broadcast that does not exist", async () => {
    prisma.broadcast.findUnique.mockResolvedValue(null);
    await expect(
      service.closeBroadcast("6a8d9c1828b1818429e64faa"),
    ).rejects.toMatchObject({ status: 404 });
  });

  it("refuses to send a message until an offer on the thread is accepted", async () => {
    // The gate: recipients must make a formal offer first, and neither side can
    // free-chat until the broadcast creator accepts it.
    prisma.broadcast.findUnique.mockResolvedValue({ id: "b1" });
    prisma.broadcastThread.findUnique.mockResolvedValue({
      id: "t1",
      broadcastId: "b1",
      buyerId: "buyer1",
      sellerId: "seller1",
    });
    prisma.broadcastOffer.findFirst.mockResolvedValue(null);

    const users = (service as never as { userService: { findUserById: jest.Mock } })
      .userService;
    users.findUserById.mockResolvedValue({ id: "buyer1", name: "Buyer" });

    await expect(
      service.sendBroadcastMessage("b1", "buyer1", "seller1", "t1", "hi"),
    ).rejects.toMatchObject({ status: 403 });
  });

  it("rejects a sender who is not a participant in the thread", async () => {
    prisma.broadcast.findUnique.mockResolvedValue({ id: "b1" });
    prisma.broadcastThread.findUnique.mockResolvedValue({
      id: "t1",
      broadcastId: "b1",
      buyerId: "buyer1",
      sellerId: "seller1",
    });

    const users = (service as never as { userService: { findUserById: jest.Mock } })
      .userService;
    users.findUserById.mockResolvedValue({ id: "x", name: "X" });

    await expect(
      service.sendBroadcastMessage("b1", "stranger", "seller1", "t1", "hi"),
    ).rejects.toMatchObject({ status: 400 });
  });
});
