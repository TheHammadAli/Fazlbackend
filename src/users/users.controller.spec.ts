import { Test, TestingModule } from "@nestjs/testing";
import { UsersController } from "./users.controller";
import { UsersService } from "./users.service";
import { ActivityLogService } from "src/activity-log/activity-log.service";

/**
 * Constructed with every dependency mocked, so this exercises the class's
 * constructor and Nest's resolution of it, nothing more. The previous version
 * of this file listed UsersController on its own with none of its
 * 2 dependencies, so the module could never compile.
 */
describe("UsersController", () => {
  let controller: UsersController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [UsersController],
      providers: [
        { provide: UsersService, useValue: {} },
        { provide: ActivityLogService, useValue: {} },
      ],
    }).compile();

    controller = module.get<UsersController>(UsersController);
  });

  it("should be defined", () => {
    expect(controller).toBeDefined();
  });
});
