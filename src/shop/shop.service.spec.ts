import { Test, TestingModule } from "@nestjs/testing";
// ShopService first: it sits in a require cycle with Products/Users/Orders.
import { ShopService } from "./shop.service";
import { ClsService } from "nestjs-cls";
import { I18nService } from "nestjs-i18n";
import { PrismaService } from "src/prisma/prisma.service";
import { GeoRepository } from "src/prisma/repositories/geo.repository";
import { EmailService } from "src/common/email-service/email-service";
import { EmailLogService } from "src/email-log/email-log.service";
import { FileUploadService } from "src/common/file-upload/file-upload.service";
import { OrdersService } from "src/orders/orders.service";
import { ProductsService } from "src/products/products.service";
import { UsersService } from "src/users/users.service";

/**
 * Now backed by Prisma rather than Mongoose, so the injected dependencies are
 * PrismaService and GeoRepository instead of six getModelToken providers.
 */
describe("ShopService", () => {
  let service: ShopService;
  let prisma: {
    shop: { findUnique: jest.Mock };
    shopView: { upsert: jest.Mock };
  };

  beforeEach(async () => {
    prisma = {
      shop: { findUnique: jest.fn() },
      shopView: { upsert: jest.fn() },
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ShopService,
        { provide: PrismaService, useValue: prisma },
        { provide: GeoRepository, useValue: { findNearby: jest.fn() } },
        { provide: ProductsService, useValue: {} },
        { provide: UsersService, useValue: {} },
        { provide: FileUploadService, useValue: {} },
        { provide: OrdersService, useValue: {} },
        { provide: I18nService, useValue: { translate: (k: string) => k } },
        { provide: ClsService, useValue: { get: () => "en" } },
        { provide: EmailService, useValue: {} },
        { provide: EmailLogService, useValue: {} },
      ],
    }).compile();

    service = module.get<ShopService>(ShopService);
  });

  it("should be defined", () => {
    expect(service).toBeDefined();
  });

  it("ignores a view with a malformed shop id", async () => {
    await service.trackView("not-an-id", "6a8d9c1828b1818429e64faa");
    expect(prisma.shop.findUnique).not.toHaveBeenCalled();
  });

  it("does not record a view when the owner opens their own shop", async () => {
    prisma.shop.findUnique.mockResolvedValue({ ownerId: "6a8d9c1828b1818429e64faa" });
    await service.trackView("6a8d9c1828b1818429e64fbb", "6a8d9c1828b1818429e64faa");
    expect(prisma.shopView.upsert).not.toHaveBeenCalled();
  });

  it("records a view for a visitor, deduped per (shop, user)", async () => {
    prisma.shop.findUnique.mockResolvedValue({ ownerId: "6a8d9c1828b1818429e64fff" });
    await service.trackView("6a8d9c1828b1818429e64fbb", "6a8d9c1828b1818429e64faa");

    const call = prisma.shopView.upsert.mock.calls[0][0];
    expect(call.where).toEqual({
      shopId_userId: {
        shopId: "6a8d9c1828b1818429e64fbb",
        userId: "6a8d9c1828b1818429e64faa",
      },
    });
    // `update: {}` is what makes a repeat view a no-op, as $setOnInsert did.
    expect(call.update).toEqual({});
  });

  it("returns nothing from a radius search that matched no shops", async () => {
    const geo = (service as never as { geoRepository: { findNearby: jest.Mock } })
      .geoRepository;
    geo.findNearby.mockResolvedValue({ ids: [], distances: new Map(), total: 0 });

    const result = await service.findShopsNearLocationPaginated([67.0011, 24.8607], 5000);
    expect(result.data).toEqual([]);
    expect(result.meta.total).toBe(0);
  });
});
