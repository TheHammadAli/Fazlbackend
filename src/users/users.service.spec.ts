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

  it("returns an empty map of last-seen times for no ids", async () => {
    await expect(service.getLastSeenFor([])).resolves.toEqual({});
    expect(prisma.user.findMany).not.toHaveBeenCalled();
  });
});
