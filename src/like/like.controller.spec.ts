import { Test, TestingModule } from "@nestjs/testing";
import { LikeController } from "./like.controller";
import { LikeService } from "./like.service";

/**
 * Constructed with every dependency mocked, so this exercises the class's
 * constructor and Nest's resolution of it, nothing more. The previous version
 * of this file listed LikeController on its own with none of its
 * 1 dependencies, so the module could never compile.
 */
describe("LikeController", () => {
  let controller: LikeController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [LikeController],
      providers: [
        { provide: LikeService, useValue: {} },
      ],
    }).compile();

    controller = module.get<LikeController>(LikeController);
  });

  it("should be defined", () => {
    expect(controller).toBeDefined();
  });
});
