import { Test, TestingModule } from "@nestjs/testing";
import { ChatController } from "./chat.controller";
import { ChatService } from "./chat.service";
import { FileUploadService } from "src/common/file-upload/file-upload.service";

/**
 * Constructed with every dependency mocked, so this exercises the class's
 * constructor and Nest's resolution of it, nothing more. The previous version
 * of this file listed ChatController on its own with none of its
 * 2 dependencies, so the module could never compile.
 */
describe("ChatController", () => {
  let controller: ChatController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [ChatController],
      providers: [
        { provide: ChatService, useValue: {} },
        { provide: FileUploadService, useValue: {} },
      ],
    }).compile();

    controller = module.get<ChatController>(ChatController);
  });

  it("should be defined", () => {
    expect(controller).toBeDefined();
  });
});
