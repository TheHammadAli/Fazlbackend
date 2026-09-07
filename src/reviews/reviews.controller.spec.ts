import { Test, TestingModule } from "@nestjs/testing";
// The class is ReviewController, not ReviewsController.
import { ReviewController } from "./reviews.controller";
import { ReviewService } from "./reviews.service";

describe("ReviewController", () => {
  let controller: ReviewController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [ReviewController],
      providers: [{ provide: ReviewService, useValue: {} }],
    }).compile();

    controller = module.get<ReviewController>(ReviewController);
  });

  it("should be defined", () => {
    expect(controller).toBeDefined();
  });
});
