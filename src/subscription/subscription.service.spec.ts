import { Test, TestingModule } from "@nestjs/testing";
import { I18nService } from "nestjs-i18n";
import { PrismaService } from "src/prisma/prisma.service";
import { SubscriptionService } from "./subscription.service";

/**
 * Now backed by Prisma rather than Mongoose, so the injected dependency is
 * PrismaService instead of a getModelToken(Subscription.name) provider.
 */
describe("SubscriptionService", () => {
  let service: SubscriptionService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        SubscriptionService,
        { provide: PrismaService, useValue: {} },
        { provide: I18nService, useValue: {} },
      ],
    }).compile();

    service = module.get<SubscriptionService>(SubscriptionService);
  });

  it("should be defined", () => {
    expect(service).toBeDefined();
  });

  it("rejects a malformed id with 400 before touching the database", async () => {
    // The old code guarded with Types.ObjectId.isValid; isObjectIdLike keeps
    // that behaviour so a bad id is still a 400 and never reaches Postgres.
    await expect(service.findById("not-an-object-id")).rejects.toMatchObject({
      status: 400,
    });
  });
});
