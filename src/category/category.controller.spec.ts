import { Test, TestingModule } from "@nestjs/testing";
import { CategoryController } from "./category.controller";
import { CategoryService } from "./category.service";
import { FileUploadService } from "src/common/file-upload/file-upload.service";

/**
 * Constructed with every dependency mocked, so this exercises the class's
 * constructor and Nest's resolution of it, nothing more. The previous version
 * of this file listed CategoryController on its own with none of its
 * 2 dependencies, so the module could never compile.
 */
describe("CategoryController", () => {
  let controller: CategoryController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [CategoryController],
      providers: [
        { provide: CategoryService, useValue: {} },
        { provide: FileUploadService, useValue: {} },
      ],
    }).compile();

    controller = module.get<CategoryController>(CategoryController);
  });

  it("should be defined", () => {
    expect(controller).toBeDefined();
  });
});
