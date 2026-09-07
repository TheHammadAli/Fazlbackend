import { Test, TestingModule } from "@nestjs/testing";
import { ClsService } from "nestjs-cls";
import { I18nService } from "nestjs-i18n";
import { PrismaService } from "src/prisma/prisma.service";
import { ReviewRepository } from "src/prisma/repositories/review.repository";
import { ReviewService } from "./reviews.service";

/**
 * Now backed by Prisma rather than Mongoose, so the injected dependencies are
 * PrismaService and ReviewRepository instead of getModelToken(Review.name).
 */
describe("ReviewService", () => {
  let service: ReviewService;
  let prisma: {
    review: { aggregate: jest.Mock; groupBy: jest.Mock; findMany: jest.Mock; findFirst: jest.Mock };
  };

  beforeEach(async () => {
    prisma = {
      review: {
        aggregate: jest.fn(),
        groupBy: jest.fn(),
        findMany: jest.fn(),
        findFirst: jest.fn(),
      },
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ReviewService,
        { provide: PrismaService, useValue: prisma },
        { provide: ReviewRepository, useValue: { findForAdmin: jest.fn() } },
        { provide: I18nService, useValue: { translate: (k: string) => k } },
        { provide: ClsService, useValue: { get: () => "en" } },
      ],
    }).compile();

    service = module.get<ReviewService>(ReviewService);
  });

  it("should be defined", () => {
    expect(service).toBeDefined();
  });

  it("reports a zero average for an item with no reviews", async () => {
    // $avg over an empty set yields null; the old pipeline returned no rows at
    // all and the caller fell back to { avgRating: 0, count: 0 }.
    prisma.review.aggregate.mockResolvedValue({
      _avg: { rating: null },
      _count: { _all: 0 },
    });
    await expect(service.getAverageRating("i1", "product")).resolves.toEqual({
      avgRating: 0,
      count: 0,
    });
  });

  it("returns the real average when reviews exist", async () => {
    prisma.review.aggregate.mockResolvedValue({
      _avg: { rating: 4.5 },
      _count: { _all: 2 },
    });
    await expect(service.getAverageRating("i1", "product")).resolves.toEqual({
      avgRating: 4.5,
      count: 2,
    });
  });

  it("keeps `_id` as the key on bulk ratings, since callers index by it", async () => {
    prisma.review.groupBy.mockResolvedValue([
      { itemId: "i1", _avg: { rating: 5 }, _count: { _all: 1 } },
    ]);
    await expect(
      service.getAverageRatingsForItems(["i1"], "product"),
    ).resolves.toEqual([{ _id: "i1", avgRating: 5, count: 1 }]);
  });

  it("short-circuits bulk lookups on an empty id list", async () => {
    await expect(service.getAverageRatingsForItems([], "product")).resolves.toEqual([]);
    expect(await service.getReviewedItemIdsForUser("u1", [], "product")).toEqual(new Set());
    expect(prisma.review.groupBy).not.toHaveBeenCalled();
    expect(prisma.review.findMany).not.toHaveBeenCalled();
  });

  it("rejects a duplicate review for the same user and item", async () => {
    prisma.review.findFirst.mockResolvedValue({ id: "existing" });
    await expect(
      service.createReview({
        userId: "u1",
        itemId: "i1",
        itemType: "product",
        rating: 5,
      } as never),
    ).rejects.toMatchObject({ status: 400 });
  });
});
