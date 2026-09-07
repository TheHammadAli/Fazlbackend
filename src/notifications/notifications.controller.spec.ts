import { Test, TestingModule } from "@nestjs/testing";
import { NotificationsController } from "./notifications.controller";
import { NotificationsService } from "./notifications.service";

/**
 * Constructed with every dependency mocked, so this exercises the class's
 * constructor and Nest's resolution of it, nothing more. The previous version
 * of this file listed NotificationsController on its own with none of its
 * 1 dependencies, so the module could never compile.
 */
describe("NotificationsController", () => {
  let controller: NotificationsController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [NotificationsController],
      providers: [
        { provide: NotificationsService, useValue: {} },
      ],
    }).compile();

    controller = module.get<NotificationsController>(NotificationsController);
  });

  it("should be defined", () => {
    expect(controller).toBeDefined();
  });
});
