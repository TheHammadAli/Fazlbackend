import { Test, TestingModule } from "@nestjs/testing";
// NotificationsService is imported first: it sits in a require cycle with
// UsersService (wired with forwardRef in the real modules).
import { NotificationsService } from "./notifications.service";
import { ClsService } from "nestjs-cls";
import { I18nService } from "nestjs-i18n";
import { PrismaService } from "src/prisma/prisma.service";
import { UsersService } from "src/users/users.service";
import { FirebaseService } from "./firebase.service";

/**
 * Now backed by Prisma rather than Mongoose, so the injected dependency is
 * PrismaService instead of a getModelToken(Notification.name) provider.
 */
describe("NotificationsService", () => {
  let service: NotificationsService;
  let prisma: { notification: { count: jest.Mock; deleteMany: jest.Mock } };
  let users: { findUserById: jest.Mock };

  beforeEach(async () => {
    prisma = { notification: { count: jest.fn(), deleteMany: jest.fn() } };
    users = { findUserById: jest.fn() };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        NotificationsService,
        { provide: PrismaService, useValue: prisma },
        { provide: UsersService, useValue: users },
        { provide: FirebaseService, useValue: {} },
        { provide: I18nService, useValue: { translate: (k: string) => k } },
        { provide: ClsService, useValue: { get: () => "en" } },
      ],
    }).compile();

    service = module.get<NotificationsService>(NotificationsService);
  });

  it("should be defined", () => {
    expect(service).toBeDefined();
  });

  it("rejects an unread-count request for a user that does not exist", async () => {
    users.findUserById.mockResolvedValue(null);
    await expect(service.getUnreadCount("u1")).rejects.toMatchObject({
      status: 400,
    });
    expect(prisma.notification.count).not.toHaveBeenCalled();
  });

  it("counts only unread notifications for the user", async () => {
    users.findUserById.mockResolvedValue({ id: "u1" });
    prisma.notification.count.mockResolvedValue(3);

    await expect(service.getUnreadCount("u1")).resolves.toBe(3);
    expect(prisma.notification.count).toHaveBeenCalledWith({
      where: { userId: "u1", read: false },
    });
  });

  it("throws 404 when deleting a notification that does not exist", async () => {
    // deleteMany reports a count instead of throwing P2025, keeping the
    // explicit 404 the old findByIdAndDelete-returned-null path produced.
    prisma.notification.deleteMany.mockResolvedValue({ count: 0 });
    await expect(service.delete("n1")).rejects.toMatchObject({ status: 404 });
  });

  it("reports success when a notification is deleted", async () => {
    prisma.notification.deleteMany.mockResolvedValue({ count: 1 });
    await expect(service.delete("n1")).resolves.toEqual({ deleted: true });
  });
});
