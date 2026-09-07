import { Test, TestingModule } from "@nestjs/testing";
// LikeService is imported FIRST on purpose. It sits in a require cycle with
// ProductsService/ServicesService (both wired with forwardRef in the real
// modules); importing a participant of that cycle before the class under test
// leaves one of the dependency classes undefined at provider-registration time,
// and Nest then reports it as unresolvable.
import { LikeService } from "./like.service";
import { ClsService } from "nestjs-cls";
import { I18nService } from "nestjs-i18n";
import { PrismaService } from "src/prisma/prisma.service";
import { NotificationsService } from "src/notifications/notifications.service";
import { ProductsService } from "src/products/products.service";
import { ServicesService } from "src/services/services.service";
import { UsersService } from "src/users/users.service";

/**
 * Now backed by Prisma rather than Mongoose, so the injected dependency is
 * PrismaService instead of a getModelToken(Like.name) provider.
 */
describe("LikeService", () => {
  let service: LikeService;
  let prisma: {
    like: {
      count: jest.Mock;
      groupBy: jest.Mock;
      findUnique: jest.Mock;
      deleteMany: jest.Mock;
    };
  };

  beforeEach(async () => {
    prisma = {
      like: {
        count: jest.fn(),
        groupBy: jest.fn(),
        findUnique: jest.fn(),
        deleteMany: jest.fn(),
      },
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        LikeService,
        { provide: PrismaService, useValue: prisma },
        { provide: ProductsService, useValue: {} },
        { provide: ServicesService, useValue: {} },
        { provide: I18nService, useValue: { translate: (k: string) => k } },
        { provide: ClsService, useValue: { get: () => "en" } },
        { provide: NotificationsService, useValue: {} },
        { provide: UsersService, useValue: {} },
      ],
    }).compile();

    service = module.get<LikeService>(LikeService);
  });

  it("should be defined", () => {
    expect(service).toBeDefined();
  });

  it("sums product and service likes for the admin dashboard card", async () => {
    prisma.like.count.mockResolvedValueOnce(7).mockResolvedValueOnce(5);
    await expect(service.getTotalLikeCount()).resolves.toEqual({
      total: 12,
      product: 7,
      service: 5,
    });
  });

  it("returns an empty map without querying when given no ids", async () => {
    // Guard preserved from the Mongoose version: an empty $in would have
    // matched nothing but still cost a round trip.
    const counts = await service.getLikeCountsForItems([], "product");
    expect(counts.size).toBe(0);
    expect(prisma.like.groupBy).not.toHaveBeenCalled();
  });

  it("maps grouped counts back to item ids", async () => {
    prisma.like.groupBy.mockResolvedValue([
      { itemId: "aaaaaaaaaaaaaaaaaaaaaaa1", _count: { _all: 3 } },
      { itemId: "aaaaaaaaaaaaaaaaaaaaaaa2", _count: { _all: 1 } },
    ]);
    const counts = await service.getLikeCountsForItems(
      ["aaaaaaaaaaaaaaaaaaaaaaa1", "aaaaaaaaaaaaaaaaaaaaaaa2"],
      "product",
    );
    expect(counts.get("aaaaaaaaaaaaaaaaaaaaaaa1")).toBe(3);
    expect(counts.get("aaaaaaaaaaaaaaaaaaaaaaa2")).toBe(1);
  });

  it("throws 404 when removing a like that does not exist", async () => {
    // deleteMany reports a count instead of throwing P2025, which keeps the
    // explicit 404 the old findOneAndDelete-returned-null path produced.
    prisma.like.deleteMany.mockResolvedValue({ count: 0 });
    await expect(
      service.removeLike("u1", { itemId: "i1", itemType: "product" } as never),
    ).rejects.toMatchObject({ status: 404 });
  });

  it("reports isLiked from a unique lookup", async () => {
    prisma.like.findUnique.mockResolvedValue({ id: "x" });
    await expect(service.isLiked("u1", "i1", "product")).resolves.toBe(true);

    prisma.like.findUnique.mockResolvedValue(null);
    await expect(service.isLiked("u1", "i1", "product")).resolves.toBe(false);
  });
});
