import { Test, TestingModule } from "@nestjs/testing";
import { I18nService } from "nestjs-i18n";
import { PrismaService } from "src/prisma/prisma.service";
import { PromotionService } from "./promotion.service";

/**
 * Now backed by Prisma rather than Mongoose, so the injected dependency is
 * PrismaService instead of a getModelToken(Promotion.name) provider.
 */
describe("PromotionService", () => {
  let service: PromotionService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        PromotionService,
        { provide: PrismaService, useValue: {} },
        { provide: I18nService, useValue: { translate: (k: string) => k } },
      ],
    }).compile();

    service = module.get<PromotionService>(PromotionService);
  });

  it("should be defined", () => {
    expect(service).toBeDefined();
  });

  it("rejects an unsupported targetType", async () => {
    await expect(
      service.create({ targetType: "Service", targetId: "x" } as never),
    ).rejects.toMatchObject({ status: 400 });
  });

  it("rejects a malformed promotion id with 400", async () => {
    await expect(service.findById("nope")).rejects.toMatchObject({ status: 400 });
  });
});
