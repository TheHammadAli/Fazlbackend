import { Test, TestingModule } from "@nestjs/testing";
import { ServicesController } from "./services.controller";
import { ServicesService } from "./services.service";

/**
 * Constructed with every dependency mocked, so this exercises the class's
 * constructor and Nest's resolution of it, nothing more. The previous version
 * of this file listed ServicesController on its own with none of its
 * 1 dependencies, so the module could never compile.
 */
describe("ServicesController", () => {
  let controller: ServicesController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [ServicesController],
      providers: [
        { provide: ServicesService, useValue: {} },
      ],
    }).compile();

    controller = module.get<ServicesController>(ServicesController);
  });

  it("should be defined", () => {
    expect(controller).toBeDefined();
  });
});
