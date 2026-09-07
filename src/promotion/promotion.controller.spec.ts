import { Test, TestingModule } from "@nestjs/testing";
import { PromotionController } from "./promotion.controller";
import { PromotionService } from "./promotion.service";

/**
 * Constructed with every dependency mocked, so this exercises the class's
 * constructor and Nest's resolution of it, nothing more. The previous version
 * of this file listed PromotionController on its own with none of its
 * 1 dependencies, so the module could never compile.
 */
describe("PromotionController", () => {
  let controller: PromotionController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [PromotionController],
      providers: [
        { provide: PromotionService, useValue: {} },
      ],
    }).compile();

    controller = module.get<PromotionController>(PromotionController);
  });

  it("should be defined", () => {
    expect(controller).toBeDefined();
  });
});
