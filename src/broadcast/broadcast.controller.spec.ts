import { Test, TestingModule } from "@nestjs/testing";
import { BroadcastController } from "./broadcast.controller";
import { BroadcastService } from "./broadcast.service";
import { ActivityLogService } from "src/activity-log/activity-log.service";
import { FileUploadService } from "src/common/file-upload/file-upload.service";

/**
 * Constructed with every dependency mocked, so this exercises the class's
 * constructor and Nest's resolution of it, nothing more. The previous version
 * of this file listed BroadcastController on its own with none of its
 * 3 dependencies, so the module could never compile.
 */
describe("BroadcastController", () => {
  let controller: BroadcastController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [BroadcastController],
      providers: [
        { provide: BroadcastService, useValue: {} },
        { provide: FileUploadService, useValue: {} },
        { provide: ActivityLogService, useValue: {} },
      ],
    }).compile();

    controller = module.get<BroadcastController>(BroadcastController);
  });

  it("should be defined", () => {
    expect(controller).toBeDefined();
  });
});
