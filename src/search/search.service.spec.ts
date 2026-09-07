import { Test, TestingModule } from "@nestjs/testing";
import { SearchService } from "./search.service";
import { ConfigService } from "@nestjs/config";

/**
 * Constructed with every dependency mocked, so this exercises the class's
 * constructor and Nest's resolution of it, nothing more. The previous version
 * of this file listed SearchService on its own with none of its
 * 1 dependencies, so the module could never compile.
 */
describe("SearchService", () => {
  let service: SearchService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        SearchService,
        { provide: ConfigService, useValue: {} },
      ],
    }).compile();

    service = module.get<SearchService>(SearchService);
  });

  it("should be defined", () => {
    expect(service).toBeDefined();
  });
});
