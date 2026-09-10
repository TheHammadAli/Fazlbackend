import { Test, TestingModule } from "@nestjs/testing";
import { BadRequestException } from "@nestjs/common";
import { CategoryService } from "./category.service";
import { ClsService } from "nestjs-cls";
import { I18nService } from "nestjs-i18n";
import { PrismaService } from "src/prisma/prisma.service";
import { CategoryType } from "./model/category.model";

/**
 * Exercises the cascading-parameter contract added to `normalizeParameters`:
 * field preservation, the recomputed `values` union, and the dependency-graph
 * validation. Goes through the public `create`/`update` methods rather than
 * calling the private normalizer directly, so it also proves the DB payload
 * actually carries what a client sent.
 */
describe("CategoryService — cascading parameters", () => {
  let service: CategoryService;
  let prisma: {
    category: {
      findFirst: jest.Mock;
      findUnique: jest.Mock;
      create: jest.Mock;
      update: jest.Mock;
    };
  };

  beforeEach(async () => {
    prisma = {
      category: {
        findFirst: jest.fn().mockResolvedValue(null), // no duplicate name/sortNumber
        findUnique: jest.fn().mockResolvedValue({ id: "cat1" }), // update() existence check
        create: jest.fn(({ data }) => data),
        update: jest.fn(({ data }) => data),
      },
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        CategoryService,
        { provide: PrismaService, useValue: prisma },
        { provide: I18nService, useValue: { translate: (key: string) => key } },
        { provide: ClsService, useValue: { get: () => "en" } },
      ],
    }).compile();

    service = module.get<CategoryService>(CategoryService);
  });

  const carsParametersEn = [
    { name: "Make", values: ["Toyota", "Honda"], valueKeys: ["toyota", "honda"] },
    {
      name: "Model",
      dependsOn: "Make",
      values: ["junk-should-be-overwritten"],
      valueKeys: ["corolla", "yaris", "city", "civic"],
      valuesByParent: { toyota: ["Corolla", "Yaris"], honda: ["City", "Civic"] },
    },
  ];

  it("preserves the three behaviour flags, dependsOn, valueKeys and valuesByParent", async () => {
    const dto: any = {
      name: { en: "Cars", ur: "گاڑیاں" },
      type: CategoryType.PRODUCT,
      parameters: {
        en: [
          {
            name: "Condition",
            values: ["New", "Used"],
            isOptional: true,
            allowCustomValue: true,
            allowMultiple: false,
          },
          ...carsParametersEn,
        ],
        ur: [],
      },
    };

    const result = await service.create(dto);
    const en = (result as any).parameters.en;

    expect(en[0]).toMatchObject({
      name: "Condition",
      values: ["New", "Used"],
      isOptional: true,
      allowCustomValue: true,
      allowMultiple: false,
    });

    const make = en[1];
    const model = en[2];
    expect(make).toMatchObject({ name: "Make", valueKeys: ["toyota", "honda"] });
    expect(model.dependsOn).toBe("Make");
    expect(model.valuesByParent).toEqual({
      toyota: ["Corolla", "Yaris"],
      honda: ["City", "Civic"],
    });
  });

  it("keeps a repeated value TEXT under two different parents distinct via valueKeysByParent (e.g. \"Samsung\" under both Mobile Phone and TV)", async () => {
    // A middle-tier parameter (Brand) is itself dependent (on Item) AND
    // depended on (by Model). Its client-sent `valueKeysByParent` — one
    // globally-unique key per bucket, exactly what the admin panel sends —
    // must survive as-is, keyed the same way in the flattened `valueKeys`.
    const dto: any = {
      name: { en: "Electronics" },
      type: CategoryType.PRODUCT,
      parameters: {
        en: [
          {
            name: "Item",
            values: ["Mobile Phone", "TV"],
            valueKeys: ["mobile-phone", "tv"],
          },
          {
            name: "Brand",
            dependsOn: "Item",
            values: [],
            valuesByParent: {
              "mobile-phone": ["Samsung"],
              tv: ["Samsung"],
            },
            valueKeysByParent: {
              "mobile-phone": ["brand-1"],
              tv: ["brand-2"],
            },
          },
          {
            name: "Model",
            dependsOn: "Brand",
            values: [],
            valuesByParent: {
              "brand-1": ["Galaxy S24"],
              "brand-2": ["Crystal UHD 55"],
            },
          },
        ],
        ur: [],
      },
    };

    const result = await service.create(dto);
    const en = (result as any).parameters.en;
    const brand = en[1];
    const model = en[2];

    // Both "Samsung" slots survive with their own distinct keys.
    expect(brand.values).toEqual(["Samsung", "Samsung"]);
    expect(brand.valueKeys).toEqual(["brand-1", "brand-2"]);
    expect(brand.valueKeysByParent).toEqual({
      "mobile-phone": ["brand-1"],
      tv: ["brand-2"],
    });
    expect(model.valuesByParent).toEqual({
      "brand-1": ["Galaxy S24"],
      "brand-2": ["Crystal UHD 55"],
    });
  });

  it("gives every value a bucket-scoped key that survives being flattened in a different order — a Postgres jsonb round-trip reorders an object's top-level keys, never an array's elements, so `values`/`valueKeys` must stay correct regardless of which order the buckets come back in", async () => {
    // This is the exact shape of the real bug: Make -> Model -> Variant,
    // three levels, more than one Make. Before the fix, Variant resolved a
    // Model's key by searching for its position in Model's globally FLAT
    // valueKeys using its index within the CURRENTLY SHOWN (Make-filtered)
    // options list — correct only when the selected Make happened to occupy
    // the first slots of that flat array. Toyota (first) accidentally
    // worked; Honda never did.
    const dto: any = {
      name: { en: "Cars" },
      type: CategoryType.PRODUCT,
      parameters: {
        en: [
          { name: "Make", values: ["Toyota", "Honda"], valueKeys: ["toyota", "honda"] },
          {
            name: "Model",
            dependsOn: "Make",
            values: [],
            valuesByParent: { toyota: ["Corolla", "Vitz"], honda: ["City", "Civic"] },
          },
        ],
        ur: [],
      },
    };

    // Created without a Variant level first, then Variant is added in a
    // second save — keyed by whatever Model's own resolved keys turn out to
    // be, read back from the create response rather than guessed, exactly
    // like a real second save (e.g. the admin's own paired editor) would do.
    const created = await service.create(dto);
    const model = (created as any).parameters.en[1];
    const vitzIndex = model.values.indexOf("Vitz");
    const vitzKey = model.valueKeys[vitzIndex];
    const cityIndex = model.values.indexOf("City");
    const cityKey = model.valueKeys[cityIndex];

    const updated = await service.update("cat1", {
      parameters: {
        en: [
          dto.parameters.en[0],
          dto.parameters.en[1],
          {
            name: "Variant",
            dependsOn: "Model",
            values: [],
            valuesByParent: {
              [vitzKey]: ["Standard", "Euro II"],
              [cityKey]: ["Aspire", "i-VTEC"],
            },
          },
        ],
        ur: [],
      },
    } as any);

    const variant = (updated as any).parameters.en[2];
    // Vitz (under Toyota, NOT the first Make) must get exactly Vitz's own
    // variants — not Corolla's, Honda's, or anything positional.
    expect(variant.valuesByParent[vitzKey]).toEqual(["Standard", "Euro II"]);
    expect(variant.valuesByParent[cityKey]).toEqual(["Aspire", "i-VTEC"]);
  });

  it("recomputes `values` on a dependent entry as the union of valuesByParent, ignoring whatever the client sent", async () => {
    const dto: any = {
      name: { en: "Cars" },
      type: CategoryType.PRODUCT,
      parameters: { en: carsParametersEn, ur: [] },
    };

    const result = await service.create(dto);
    const model = (result as any).parameters.en[1];

    expect(model.values).toEqual(["Corolla", "Yaris", "City", "Civic"]);
  });

  it("auto-generates valueKeys for a parent that is depended on but didn't supply its own", async () => {
    const dto: any = {
      name: { en: "Cars" },
      type: CategoryType.PRODUCT,
      parameters: {
        en: [
          { name: "Make", values: ["Toyota", "Honda"] }, // no valueKeys supplied
          {
            name: "Model",
            dependsOn: "Make",
            values: [],
            valuesByParent: { toyota: ["Corolla"], honda: ["City"] },
          },
        ],
        ur: [],
      },
    };

    const result = await service.create(dto);
    const make = (result as any).parameters.en[0];

    expect(make.valueKeys).toEqual(["toyota", "honda"]);
  });

  it("rejects a forward reference (dependsOn pointing at a later entry)", async () => {
    const dto: any = {
      name: { en: "Cars" },
      type: CategoryType.PRODUCT,
      parameters: {
        en: [
          { name: "Make", dependsOn: "Model", values: [], valuesByParent: { x: ["y"] } },
          { name: "Model", values: ["Corolla"], valueKeys: ["corolla"] },
        ],
        ur: [],
      },
    };

    await expect(service.create(dto)).rejects.toThrow(BadRequestException);
  });

  it("rejects an unknown parent name", async () => {
    const dto: any = {
      name: { en: "Cars" },
      type: CategoryType.PRODUCT,
      parameters: {
        en: [
          { name: "Make", values: ["Toyota"], valueKeys: ["toyota"] },
          {
            name: "Model",
            dependsOn: "Colour",
            values: [],
            valuesByParent: { toyota: ["Corolla"] },
          },
        ],
        ur: [],
      },
    };

    await expect(service.create(dto)).rejects.toThrow(BadRequestException);
  });

  it("rejects a valuesByParent key the parent doesn't have", async () => {
    const dto: any = {
      name: { en: "Cars" },
      type: CategoryType.PRODUCT,
      parameters: {
        en: [
          { name: "Make", values: ["Toyota"], valueKeys: ["toyota"] },
          {
            name: "Model",
            dependsOn: "Make",
            values: [],
            valuesByParent: { tesla: ["Model S"] },
          },
        ],
        ur: [],
      },
    };

    await expect(service.create(dto)).rejects.toThrow(BadRequestException);
  });

  it("rejects a dependent entry with no valuesByParent at all", async () => {
    const dto: any = {
      name: { en: "Cars" },
      type: CategoryType.PRODUCT,
      parameters: {
        en: [
          { name: "Make", values: ["Toyota"], valueKeys: ["toyota"] },
          { name: "Model", dependsOn: "Make", values: [] },
        ],
        ur: [],
      },
    };

    await expect(service.create(dto)).rejects.toThrow(BadRequestException);
  });

  it("rejects mismatched en/ur parameter counts", async () => {
    const dto: any = {
      name: { en: "Cars" },
      type: CategoryType.PRODUCT,
      parameters: {
        en: [{ name: "Make", values: ["Toyota"] }],
        ur: [{ name: "میک", values: ["ٹویوٹا"] }, { name: "ماڈل", values: [] }],
      },
    };

    await expect(service.create(dto)).rejects.toThrow(BadRequestException);
  });

  it("rejects en/ur disagreeing on which positions are dependent", async () => {
    const dto: any = {
      name: { en: "Cars" },
      type: CategoryType.PRODUCT,
      parameters: {
        en: carsParametersEn,
        ur: [
          { name: "میک", values: ["ٹویوٹا", "ہونڈا"], valueKeys: ["toyota", "honda"] },
          { name: "ماڈل", values: ["کرولا", "یارس", "سٹی", "سِوک"] }, // no dependsOn here
        ],
      },
    };

    await expect(service.create(dto)).rejects.toThrow(BadRequestException);
  });

  it("leaves a plain (non-cascading) category exactly as before", async () => {
    const dto: any = {
      name: { en: "Electronics" },
      type: CategoryType.PRODUCT,
      parameters: {
        en: [{ name: "Colour", values: ["Red", "Blue"] }],
        ur: [{ name: "رنگ", values: ["سرخ", "نیلا"] }],
      },
    };

    const result = await service.create(dto);
    const en = (result as any).parameters.en;

    expect(en[0]).toEqual({ name: "Colour", values: ["Red", "Blue"] });
  });

  it("update() omitting `parameters` entirely leaves it untouched (was previously wiped)", async () => {
    await service.update("cat1", { sortNumber: 5 } as any);

    const updateCall = prisma.category.update.mock.calls[0][0];
    expect(updateCall.data).not.toHaveProperty("parameters");
  });

  it("update() with an explicit `parameters` still normalizes and validates it", async () => {
    await service.update("cat1", {
      parameters: { en: carsParametersEn, ur: [] },
    } as any);

    const updateCall = prisma.category.update.mock.calls[0][0];
    expect(updateCall.data.parameters.en[1].values).toEqual([
      "Corolla",
      "Yaris",
      "City",
      "Civic",
    ]);
  });
});
