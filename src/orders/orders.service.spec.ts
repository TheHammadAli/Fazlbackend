import { Test, TestingModule } from "@nestjs/testing";
// OrdersService first: it sits in a require cycle with Products/Shop/Users.
import { OrdersService } from "./orders.service";
import { ClsService } from "nestjs-cls";
import { I18nService } from "nestjs-i18n";
import { PrismaService } from "src/prisma/prisma.service";
import { NotificationsService } from "src/notifications/notifications.service";
import { ProductsService } from "src/products/products.service";
import { ShopService } from "src/shop/shop.service";
import { UsersService } from "src/users/users.service";

/**
 * Now backed by Prisma rather than Mongoose, so the injected dependency is
 * PrismaService instead of a getModelToken(Order.name) provider.
 */
describe("OrdersService", () => {
  let service: OrdersService;
  let prisma: { order: { deleteMany: jest.Mock; findUnique: jest.Mock } };

  beforeEach(async () => {
    prisma = { order: { deleteMany: jest.fn(), findUnique: jest.fn() } };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        OrdersService,
        { provide: PrismaService, useValue: prisma },
        { provide: UsersService, useValue: {} },
        { provide: ProductsService, useValue: {} },
        { provide: ShopService, useValue: {} },
        { provide: NotificationsService, useValue: {} },
        { provide: I18nService, useValue: { translate: (k: string) => k } },
        { provide: ClsService, useValue: { get: () => "en" } },
      ],
    }).compile();

    service = module.get<OrdersService>(OrdersService);
  });

  it("should be defined", () => {
    expect(service).toBeDefined();
  });

  it("rejects a malformed order id with 400 before querying", async () => {
    await expect(service.getOrderById("nope")).rejects.toMatchObject({ status: 400 });
    expect(prisma.order.findUnique).not.toHaveBeenCalled();
  });

  it("throws 404 when deleting an order that does not exist", async () => {
    prisma.order.deleteMany.mockResolvedValue({ count: 0 });
    await expect(
      service.deleteOrder("6a8d9c1828b1818429e64faa"),
    ).rejects.toMatchObject({ status: 404 });
  });

  it("rejects a malformed owner id on the owner listing", async () => {
    await expect(service.getOrdersByOwner("bad", "Shop")).rejects.toMatchObject({
      status: 400,
    });
  });
});
