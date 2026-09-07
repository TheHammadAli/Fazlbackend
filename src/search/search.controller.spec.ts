import { Test, TestingModule } from "@nestjs/testing";
import { SearchController } from "./search.controller";
import { SearchService } from "./search.service";
import { ProductsService } from "src/products/products.service";
import { ServicesService } from "src/services/services.service";

/**
 * Constructed with every dependency mocked, so this exercises the class's
 * constructor and Nest's resolution of it, nothing more. The previous version
 * of this file listed SearchController on its own with none of its
 * 3 dependencies, so the module could never compile.
 */
describe("SearchController", () => {
  let controller: SearchController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [SearchController],
      providers: [
        { provide: SearchService, useValue: {} },
        { provide: ProductsService, useValue: {} },
        { provide: ServicesService, useValue: {} },
      ],
    }).compile();

    controller = module.get<SearchController>(SearchController);
  });

  it("should be defined", () => {
    expect(controller).toBeDefined();
  });
});
