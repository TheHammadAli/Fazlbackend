import { Test, TestingModule } from "@nestjs/testing";
import { OrdersController } from "./orders.controller";
import { OrdersService } from "./orders.service";

/**
 * Constructed with every dependency mocked, so this exercises the class's
 * constructor and Nest's resolution of it, nothing more. The previous version
 * of this file listed OrdersController on its own with none of its
 * 1 dependencies, so the module could never compile.
 */
describe("OrdersController", () => {
  let controller: OrdersController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [OrdersController],
      providers: [
        { provide: OrdersService, useValue: {} },
      ],
    }).compile();

    controller = module.get<OrdersController>(OrdersController);
  });

  it("should be defined", () => {
    expect(controller).toBeDefined();
  });
});
