import { Test, TestingModule } from "@nestjs/testing";
// ProductsService first: it sits in require cycles with Shop/Users/Like/Category.
import { ProductsService } from "./products.service";
import { ClsService } from "nestjs-cls";
import { I18nService } from "nestjs-i18n";
import { PrismaService } from "src/prisma/prisma.service";
import { FeedRepository } from "src/prisma/repositories/feed.repository";
import { ActivityLogService } from "src/activity-log/activity-log.service";
import { EmailService } from "src/common/email-service/email-service";
import { EmailLogService } from "src/email-log/email-log.service";
import { FileUploadService } from "src/common/file-upload/file-upload.service";
import { CategoryService } from "src/category/category.service";
import { LikeService } from "src/like/like.service";
import { PromotionService } from "src/promotion/promotion.service";
import { ReviewService } from "src/reviews/reviews.service";
import { ShareService } from "src/share/share.service";
import { ShopService } from "src/shop/shop.service";
import { UsersService } from "src/users/users.service";
import { ListingUtilsService } from "src/shared/listing-util-service";
import { buildSearchableTags } from "./model/product.model";

/**
 * Now backed by Prisma rather than Mongoose, so the injected dependencies are
 * PrismaService and FeedRepository instead of five getModelToken providers.
 */
describe("ProductsService", () => {
  let service: ProductsService;
  let prisma: {
    product: { findUnique: jest.Mock };
    productView: { upsert: jest.Mock };
  };

  beforeEach(async () => {
    prisma = {
      product: { findUnique: jest.fn() },
      productView: { upsert: jest.fn() },
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ProductsService,
        { provide: PrismaService, useValue: prisma },
        { provide: FeedRepository, useValue: {} },
        { provide: ShopService, useValue: {} },
        { provide: ListingUtilsService, useValue: {} },
        { provide: UsersService, useValue: {} },
        { provide: FileUploadService, useValue: {} },
        { provide: PromotionService, useValue: {} },
        { provide: I18nService, useValue: { translate: (k: string) => k } },
        { provide: ClsService, useValue: { get: () => "en" } },
        { provide: LikeService, useValue: {} },
        { provide: ShareService, useValue: {} },
        { provide: ReviewService, useValue: {} },
        { provide: ActivityLogService, useValue: {} },
        { provide: EmailService, useValue: {} },
        { provide: EmailLogService, useValue: {} },
        { provide: CategoryService, useValue: {} },
      ],
    }).compile();

    service = module.get<ProductsService>(ProductsService);
  });

  it("should be defined", () => {
    expect(service).toBeDefined();
  });

  it("ignores a view with a malformed product id", async () => {
    await service.trackView("not-an-id", "6a8d9c1828b1818429e64faa");
    expect(prisma.product.findUnique).not.toHaveBeenCalled();
  });

  it("does not record a view when the owner opens their own listing", async () => {
    prisma.product.findUnique.mockResolvedValue({
      shopId: null,
      ownerId: "6a8d9c1828b1818429e64faa",
    });
    await service.trackView("6a8d9c1828b1818429e64fbb", "6a8d9c1828b1818429e64faa");
    expect(prisma.productView.upsert).not.toHaveBeenCalled();
  });

  it("day-dedupes a listing view", async () => {
    prisma.product.findUnique.mockResolvedValue({
      shopId: null,
      ownerId: "6a8d9c1828b1818429e64fff",
    });
    await service.trackView("6a8d9c1828b1818429e64fbb", "6a8d9c1828b1818429e64faa");

    const call = prisma.productView.upsert.mock.calls[0][0];
    expect(call.where.productId_userId_day.day).toMatch(/^\d{4}-\d{2}-\d{2}$/);
    // `update: {}` is what makes a same-day refresh a no-op, as $setOnInsert did.
    expect(call.update).toEqual({});
  });
});

describe("buildSearchableTags", () => {
  it("flattens parameter names and variants", () => {
    expect(
      buildSearchableTags([
        { name: "Color", variants: ["Red", "Blue"] },
        { name: "Size", variants: ["S", "M"] },
      ]),
    ).toEqual(["Color", "Red", "Blue", "Size", "S", "M"]);
  });

  it("de-duplicates repeated values", () => {
    expect(
      buildSearchableTags([
        { name: "Color", variants: ["Red"] },
        { name: "Color", variants: ["Red", "Blue"] },
      ]),
    ).toEqual(["Color", "Red", "Blue"]);
  });

  it("survives malformed input rather than throwing", () => {
    // The Mongoose hooks guarded the same way; a listing must not fail to save
    // because its parameters arrived in an odd shape.
    expect(buildSearchableTags(undefined)).toEqual([]);
    expect(buildSearchableTags("not an array")).toEqual([]);
    expect(buildSearchableTags([{ name: "Color" }])).toEqual(["Color"]);
    expect(buildSearchableTags([{ variants: ["Red"] }])).toEqual(["Red"]);
  });
});
