import { Test, TestingModule } from "@nestjs/testing";
import { ProductsController } from "./products.controller";
import { ProductsService } from "./products.service";
import { ActivityLogService } from "src/activity-log/activity-log.service";

/**
 * Constructed with every dependency mocked, so this exercises the class's
 * constructor and Nest's resolution of it, nothing more. The previous version
 * of this file listed ProductsController on its own with none of its
 * 2 dependencies, so the module could never compile.
 */
describe("ProductsController", () => {
  let controller: ProductsController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [ProductsController],
      providers: [
        { provide: ProductsService, useValue: {} },
        { provide: ActivityLogService, useValue: {} },
      ],
    }).compile();

    controller = module.get<ProductsController>(ProductsController);
  });

  it("should be defined", () => {
    expect(controller).toBeDefined();
  });
});
