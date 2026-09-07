import { Test, TestingModule } from "@nestjs/testing";
import { SubscriptionController } from "./subscription.controller";
import { SubscriptionService } from "./subscription.service";

/**
 * Constructed with every dependency mocked, so this exercises the class's
 * constructor and Nest's resolution of it, nothing more. The previous version
 * of this file listed SubscriptionController on its own with none of its
 * 1 dependencies, so the module could never compile.
 */
describe("SubscriptionController", () => {
  let controller: SubscriptionController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [SubscriptionController],
      providers: [
        { provide: SubscriptionService, useValue: {} },
      ],
    }).compile();

    controller = module.get<SubscriptionController>(SubscriptionController);
  });

  it("should be defined", () => {
    expect(controller).toBeDefined();
  });
});
