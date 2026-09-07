import { Test, TestingModule } from "@nestjs/testing";
import { CategoryService } from "./category.service";
import { ClsService } from "nestjs-cls";
import { I18nService } from "nestjs-i18n";
import { PrismaService } from "src/prisma/prisma.service";

/**
 * Now backed by Prisma rather than Mongoose, so the injected dependency is
 * PrismaService instead of getModelToken(Category.name) / (CategoryRequest.name).
 */
describe("CategoryService", () => {
  let service: CategoryService;
  let prisma: {
    category: { findFirst: jest.Mock; create: jest.Mock; findMany: jest.Mock };
  };

  beforeEach(async () => {
    prisma = {
      category: { findFirst: jest.fn(), create: jest.fn(), findMany: jest.fn() },
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        CategoryService,
        { provide: PrismaService, useValue: prisma },
        { provide: I18nService, useValue: { translate: (k: string) => k } },
        { provide: ClsService, useValue: { get: () => "en" } },
      ],
    }).compile();

    service = module.get<CategoryService>(CategoryService);
  });

  it("should be defined", () => {
    expect(service).toBeDefined();
  });

  it("reuses the existing hidden Video Post category instead of creating a second one", async () => {
    prisma.category.findFirst.mockResolvedValue({ id: "cat1", isDisabled: true });

    const result = await service.findOrCreateVideoPostCategory();

    expect(result.id).toBe("cat1");
    expect(prisma.category.create).not.toHaveBeenCalled();
    // The lookup must ignore isDisabled, or a disabled sentinel would be
    // recreated on every video post.
    const where = prisma.category.findFirst.mock.calls[0][0].where;
    expect(where).not.toHaveProperty("isDisabled");
    expect(where.name).toEqual({ path: ["en"], equals: "Video Post" });
  });

  it("creates the Video Post category hidden from every picker", async () => {
    prisma.category.findFirst.mockResolvedValue(null);
    prisma.category.create.mockImplementation(({ data }: any) => ({ ...data }));

    const created = await service.findOrCreateVideoPostCategory();

    expect(created.isDisabled).toBe(true);
    expect(created.type).toBe("product");
  });

  it("rejects parameters that are not a JSON object", () => {
    // normalizeParameters is exercised through create(); an array or a
    // non-parseable string is a 400, never a silently empty parameter set.
    expect(() => (service as never as { normalizeParameters(v: unknown): unknown })
      .normalizeParameters("{not json")).toThrow();
    expect(() => (service as never as { normalizeParameters(v: unknown): unknown })
      .normalizeParameters([1, 2, 3])).toThrow();
  });

  it("normalizes absent parameters to empty per-locale lists", () => {
    const out = (service as never as { normalizeParameters(v: unknown): unknown })
      .normalizeParameters(undefined);
    expect(out).toEqual({ en: [], ur: [] });
  });
});
