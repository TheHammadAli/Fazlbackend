import { Test, TestingModule } from "@nestjs/testing";
// UsersService first: it sits in a require cycle with Shop/Products/Services/Chat.
import { UsersService } from "./users.service";
import { ClsService } from "nestjs-cls";
import { I18nService } from "nestjs-i18n";
import { PrismaService } from "src/prisma/prisma.service";
import { FileUploadService } from "src/common/file-upload/file-upload.service";
import { EmailService } from "src/common/email-service/email-service";
import { PresenceService } from "src/presence/presence.service";
import { ChatService } from "src/chat/chat.service";
import { ProductsService } from "src/products/products.service";
import { ServicesService } from "src/services/services.service";
import { ShopService } from "src/shop/shop.service";

/**
 * Now backed by Prisma rather than Mongoose, so the injected dependency is
 * PrismaService instead of getModelToken(User.name) / (Counter.name).
 */
describe("UsersService", () => {
  let service: UsersService;
  let prisma: { user: { findMany: jest.Mock; findUnique: jest.Mock } };

  beforeEach(async () => {
    prisma = { user: { findMany: jest.fn(), findUnique: jest.fn() } };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        UsersService,
        { provide: PrismaService, useValue: prisma },
        { provide: FileUploadService, useValue: {} },
        { provide: I18nService, useValue: { translate: (k: string) => k } },
        { provide: ClsService, useValue: { get: () => "en" } },
        { provide: ShopService, useValue: {} },
        { provide: ProductsService, useValue: {} },
        { provide: ServicesService, useValue: {} },
        { provide: ChatService, useValue: {} },
        { provide: PresenceService, useValue: {} },
        { provide: EmailService, useValue: {} },
      ],
    }).compile();

    service = module.get<UsersService>(UsersService);
  });

  it("should be defined", () => {
    expect(service).toBeDefined();
  });

  it("rejects a malformed member id before querying", async () => {
    // Was Types.ObjectId.isValid; isObjectIdLike preserves the same guard.
    await expect(service.assertMemberIds(["not-an-id"])).rejects.toMatchObject({
      status: 400,
    });
    expect(prisma.user.findMany).not.toHaveBeenCalled();
  });

  it("rejects ids that are not moderator accounts", async () => {
    // Two ids requested, one row back -> at least one is not a member.
    prisma.user.findMany.mockResolvedValue([{ id: "6a8d9c1828b1818429e64faa" }]);
    await expect(
      service.assertMemberIds([
        "6a8d9c1828b1818429e64faa",
        "6a8d9c1828b1818429e64fbb",
      ]),
    ).rejects.toMatchObject({ status: 400 });
  });

  it("returns the ids when every account is a member", async () => {
    prisma.user.findMany.mockResolvedValue([
      { id: "6a8d9c1828b1818429e64faa" },
      { id: "6a8d9c1828b1818429e64fbb" },
    ]);
    await expect(
      service.assertMemberIds([
        "6a8d9c1828b1818429e64faa",
        "6a8d9c1828b1818429e64fbb",
      ]),
    ).resolves.toEqual([
      "6a8d9c1828b1818429e64faa",
      "6a8d9c1828b1818429e64fbb",
    ]);
  });

  it("de-duplicates ids before validating them", async () => {
    prisma.user.findMany.mockResolvedValue([{ id: "6a8d9c1828b1818429e64faa" }]);
    await expect(
      service.assertMemberIds([
        "6a8d9c1828b1818429e64faa",
        "6a8d9c1828b1818429e64faa",
      ]),
    ).resolves.toEqual(["6a8d9c1828b1818429e64faa"]);
  });

  it("returns an empty map of last-seen times for no ids", async () => {
    await expect(service.getLastSeenFor([])).resolves.toEqual({});
    expect(prisma.user.findMany).not.toHaveBeenCalled();
  });
});
