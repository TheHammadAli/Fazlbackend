import { Test, TestingModule } from "@nestjs/testing";
import { ShopController } from "./shop.controller";
import { ShopService } from "./shop.service";
import { ActivityLogService } from "src/activity-log/activity-log.service";

/**
 * Constructed with every dependency mocked, so this exercises the class's
 * constructor and Nest's resolution of it, nothing more. The previous version
 * of this file listed ShopController on its own with none of its
 * 2 dependencies, so the module could never compile.
 */
describe("ShopController", () => {
  let controller: ShopController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [ShopController],
      providers: [
        { provide: ShopService, useValue: {} },
        { provide: ActivityLogService, useValue: {} },
      ],
    }).compile();

    controller = module.get<ShopController>(ShopController);
  });

  it("should be defined", () => {
    expect(controller).toBeDefined();
  });
});
