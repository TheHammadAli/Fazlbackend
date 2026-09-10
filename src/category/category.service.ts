// src/categories/category.service.ts
import {
  Injectable,
  NotFoundException,
  ConflictException,
  BadRequestException,
} from "@nestjs/common";
import { I18nService } from "nestjs-i18n";
import { ClsService } from "nestjs-cls";
import { PrismaService } from "src/prisma/prisma.service";
import { generateObjectId } from "src/common/utils/object-id.util";
import { CreateUpdateCategoryDto } from "./dto/category-create-update.dto";
import { CreateCategoryRequestDto } from "./dto/category-request.dto";
import { ReviewCategoryRequestDto } from "./dto/review-category.dto";
import {
  CategoryType,
  type Category,
  type CategoryParameter,
  type CategoryParameters,
  type LocalizedText,
} from "./model/category.model";
import type { Prisma } from "../../generated/prisma/client";

@Injectable()
export class CategoryService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly i18n: I18nService,
    private readonly cls: ClsService,
  ) {}

  private getLocalizedValue = (
    field: unknown,
    lang = "en",
  ): string => {
    const map = (field ?? {}) as LocalizedText;
    if (typeof map === "string") return map;
    return map?.[lang] || map?.["en"] || "";
  };

  private get lang(): string {
    return this.cls?.get("lang") ?? "en";
  }

  /**
   * Normalize category parameters into a safe structure:
   * { en: [{ name, values, ... }], ur: [{ name, values, ... }] }
   *
   * Also validates the dependency graph a cascading parameter (e.g. "Model"
   * depending on "Make") describes Ã¢â‚¬â€ this is the only enforcement point that
   * will ever see this field: `parameters` arrives as a JSON string,
   * JSON.parse'd in the controller, and there is no global ValidationPipe to
   * catch a malformed graph before it gets here.
   */
  private normalizeParameters(parameters: any): CategoryParameters {
    if (!parameters) {
      return { en: [], ur: [] };
    }

    if (typeof parameters === "string") {
      try {
        parameters = JSON.parse(parameters);
      } catch {
        throw new BadRequestException(
          this.i18n.translate("auth.category.invalid_parameters_format", { lang: this.lang }),
        );
      }
    }

    if (typeof parameters !== "object" || parameters === null || Array.isArray(parameters)) {
      throw new BadRequestException(
        this.i18n.translate("auth.category.invalid_parameters_format", { lang: this.lang }),
      );
    }

    const normalized: CategoryParameters = { en: [], ur: [] };

    for (const lang of ["en", "ur"] as const) {
      const items = this.normalizeParameterList(parameters?.[lang]);
      this.validateParameterGraph(items);
      normalized[lang] = items;
    }

    this.validateParameterLocaleAlignment(normalized.en, normalized.ur);

    return normalized;
  }

  private normalizeParameterList(value: any): CategoryParameter[] {
    const items: CategoryParameter[] = !value
      ? []
      : Array.isArray(value)
        ? value.map((item) => this.normalizeParameterItem(item))
        : typeof value === "object"
          ? [this.normalizeParameterItem(value)]
          : [];

    // A parameter that a later one depends on needs stable ids for its own
    // values whether or not it is itself dependent (e.g. "Make", which has no
    // `dependsOn` of its own but is what "Model" addresses). Auto-generate
    // rather than requiring every API caller to invent ids by hand Ã¢â‚¬â€ the
    // admin UI supplies its own, and this is only the fallback.
    const dependedOnNames = new Set(
      items.map((item) => item.dependsOn).filter((name): name is string => !!name),
    );
    for (const item of items) {
      if (
        dependedOnNames.has(item.name) &&
        (!item.valueKeys || item.valueKeys.length !== item.values.length)
      ) {
        item.valueKeys = this.generateValueKeys(item.values);
      }
    }

    return items;
  }

  private normalizeParameterItem(item: any): CategoryParameter {
    if (typeof item === "string") {
      return { name: item.trim(), values: [] };
    }

    if (Array.isArray(item)) {
      return { name: item.join("").trim(), values: [] };
    }

    if (typeof item !== "object" || item === null) {
      return { name: "", values: [] };
    }

    const rawName =
      typeof item.name === "string"
        ? item.name
        : typeof item.label === "string"
          ? item.label
          : this.extractNameFromKeyedObject(item);

    const rawValues = Array.isArray(item.values)
      ? item.values.filter((value: any) => typeof value === "string")
      : [];

    const result: CategoryParameter = {
      name: rawName?.trim?.() || "",
      values: rawValues,
    };

    // Preserve the three behaviour flags rather than defaulting them away Ã¢â‚¬â€
    // they used to be silently dropped here on every write and every read.
    if (typeof item.isOptional === "boolean") result.isOptional = item.isOptional;
    if (typeof item.allowCustomValue === "boolean") result.allowCustomValue = item.allowCustomValue;
    if (typeof item.allowMultiple === "boolean") result.allowMultiple = item.allowMultiple;

    const dependsOn = typeof item.dependsOn === "string" ? item.dependsOn.trim() : "";
    const valuesByParent =
      item.valuesByParent &&
      typeof item.valuesByParent === "object" &&
      !Array.isArray(item.valuesByParent)
        ? this.normalizeValuesByParent(item.valuesByParent)
        : null;
    const valueKeysByParentInput =
      item.valueKeysByParent &&
      typeof item.valueKeysByParent === "object" &&
      !Array.isArray(item.valueKeysByParent)
        ? this.normalizeValuesByParent(item.valueKeysByParent)
        : null;

    // `dependsOn` is preserved on its own, even when `valuesByParent` is
    // missing or empty Ã¢â‚¬â€ that incomplete-but-declared state has to reach
    // validateParameterGraph as a real, named error ("depends on Make but has
    // no values"), not disappear silently into a parameter that looks
    // ordinary.
    if (dependsOn) {
      result.dependsOn = dependsOn;
    }

    if (dependsOn && valuesByParent && Object.keys(valuesByParent).length > 0) {
      result.valuesByParent = valuesByParent;

      // Every bucket needs a matching bucket of keys, whether the caller
      // supplied one or not Ã¢â‚¬â€ this is deliberately never the flat
      // `item.valueKeys` array read on its own (see below): a bucket's
      // values and a bucket's keys must come from the SAME per-bucket
      // source, or a later Postgres jsonb round-trip (which reorders an
      // object's top-level keys, but never an array's elements) can silently
      // pair "Vitz" from Toyota's bucket with a key that belonged to a
      // different make's bucket the first time this was ever true Ã¢â‚¬â€ them
      // both being derived from `valuesByParent` bucket-by-bucket, in the
      // same pass, is what keeps that impossible.
      const valueKeysByParent = this.resolveValueKeysByParent(valuesByParent, valueKeysByParentInput);
      result.valueKeysByParent = valueKeysByParent;

      // Never trust a client-sent `values`/`valueKeys` on a dependent entry Ã¢â‚¬â€
      // both are always recomputed together from valuesByParent/
      // valueKeysByParent, bucket by bucket, so position i in one always
      // names the same value as position i in the other. This is also what
      // lets an old client, which has never heard of `dependsOn`, still see
      // a real, usable (if unfiltered) list instead of an empty, unfillable
      // field.
      const flattened = this.flattenBuckets(valuesByParent, valueKeysByParent);
      result.values = flattened.values;
      result.valueKeys = flattened.valueKeys;
      return result;
    }

    if (
      Array.isArray(item.valueKeys) &&
      item.valueKeys.every((key: unknown) => typeof key === "string")
    ) {
      result.valueKeys = item.valueKeys as string[];
    }

    return result;
  }

  /**
   * Ensures every bucket in `valuesByParent` has a matching bucket of keys Ã¢â‚¬â€
   * whatever the caller supplied, when its length matches that bucket's
   * values; freshly generated (slug + collision suffix, unique across the
   * WHOLE entry, not just within one bucket) otherwise.
   */
  private resolveValueKeysByParent(
    valuesByParent: Record<string, string[]>,
    providedKeysByParent: Record<string, string[]> | null,
  ): Record<string, string[]> {
    const used = new Map<string, number>();
    const result: Record<string, string[]> = {};

    for (const [bucketKey, values] of Object.entries(valuesByParent)) {
      const provided = providedKeysByParent?.[bucketKey];
      if (provided && provided.length === values.length) {
        result[bucketKey] = provided;
        continue;
      }

      result[bucketKey] = values.map((value, index) => {
        const base = this.slugifyValue(value) || `value-${index}`;
        const seen = used.get(base) ?? 0;
        used.set(base, seen + 1);
        return seen === 0 ? base : `${base}-${seen + 1}`;
      });
    }

    return result;
  }

  /**
   * Flattens `valuesByParent` and its matching `valueKeysByParent` into one
   * values array and one keys array, bucket by bucket, in the SAME pass Ã¢â‚¬â€
   * which is what guarantees `values[i]` and `valueKeys[i]` always name the
   * same value no matter what order Postgres hands the buckets back in.
   */
  private flattenBuckets(
    valuesByParent: Record<string, string[]>,
    valueKeysByParent: Record<string, string[]>,
  ): { values: string[]; valueKeys: string[] } {
    const values: string[] = [];
    const valueKeys: string[] = [];

    for (const [bucketKey, bucketValues] of Object.entries(valuesByParent)) {
      const bucketKeys = valueKeysByParent[bucketKey] ?? [];
      bucketValues.forEach((value, index) => {
        values.push(value);
        valueKeys.push(bucketKeys[index] ?? `${bucketKey}-${index}`);
      });
    }

    return { values, valueKeys };
  }

  private normalizeValuesByParent(raw: Record<string, any>): Record<string, string[]> {
    const normalized: Record<string, string[]> = {};
    for (const [key, list] of Object.entries(raw)) {
      if (typeof key !== "string" || !key.trim()) continue;
      if (!Array.isArray(list)) continue;
      const values = list.filter((value): value is string => typeof value === "string");
      if (values.length > 0) normalized[key.trim()] = values;
    }
    return normalized;
  }

  /**
   * Flattens every parent bucket into one list, in parent order. Deliberately
   * NOT deduplicated by text: a value's identity is its key (parallel to
   * `valueKeys`), not its display text, and two different keyed slots can
   * legitimately share the same text Ã¢â‚¬â€ e.g. "Samsung" is a real value under
   * both a "Mobile Phone" and a "TV" parent in an Electronics category.
   * Dropping one as a duplicate would silently shrink `values` below
   * `valueKeys`'s length, which is exactly what used to make a client-sent
   * key set look stale and get regenerated out from under it.
   */
  private unionOfValuesByParent(valuesByParent: Record<string, string[]>): string[] {
    const union: string[] = [];
    for (const values of Object.values(valuesByParent)) {
      union.push(...values);
    }
    return union;
  }

  /** Deterministic, collision-safe ids for a value list: "Toyota" -> "toyota". */
  private generateValueKeys(values: string[]): string[] {
    const used = new Map<string, number>();
    return values.map((value, index) => {
      const base = this.slugifyValue(value) || `value-${index}`;
      const seen = used.get(base) ?? 0;
      used.set(base, seen + 1);
      return seen === 0 ? base : `${base}-${seen + 1}`;
    });
  }

  private slugifyValue(value: string): string {
    return value
      .trim()
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "");
  }

  /**
   * Validates one locale's parameter array. `dependsOn` must name an entry at
   * a strictly earlier index in the SAME array Ã¢â‚¬â€ that single rule is what
   * makes a dependency cycle unrepresentable, so no graph walk is needed.
   */
  private validateParameterGraph(items: CategoryParameter[]) {
    const nameToIndex = new Map<string, number>();
    items.forEach((item, index) => {
      if (item.name) nameToIndex.set(item.name, index);
    });

    items.forEach((item, index) => {
      if (!item.dependsOn) return;

      const parentIndex = nameToIndex.get(item.dependsOn);
      if (parentIndex === undefined) {
        throw new BadRequestException(
          this.i18n.translate("auth.category.dependency_unknown_parent", {
            lang: this.lang,
            args: { name: item.name, parent: item.dependsOn },
          }),
        );
      }
      if (parentIndex >= index) {
        throw new BadRequestException(
          this.i18n.translate("auth.category.dependency_must_precede", {
            lang: this.lang,
            args: { name: item.name, parent: item.dependsOn },
          }),
        );
      }

      if (!item.valuesByParent || Object.keys(item.valuesByParent).length === 0) {
        throw new BadRequestException(
          this.i18n.translate("auth.category.dependency_values_required", {
            lang: this.lang,
            args: { name: item.name, parent: item.dependsOn },
          }),
        );
      }

      const parentKeys = new Set(items[parentIndex].valueKeys ?? []);
      for (const key of Object.keys(item.valuesByParent)) {
        if (!parentKeys.has(key)) {
          throw new BadRequestException(
            this.i18n.translate("auth.category.dependency_unknown_value", {
              lang: this.lang,
              args: { name: item.name, parent: item.dependsOn },
            }),
          );
        }
      }
    });
  }

  /**
   * A light cross-locale check Ã¢â‚¬â€ same count, and the same positions carry a
   * dependency Ã¢â‚¬â€ rather than requiring identical value keys. Value keys may
   * legitimately differ between locales when the server had to auto-generate
   * them independently for each (an Urdu value slugifies very differently
   * from its English counterpart); resolution never needs them to match,
   * since each locale's array is resolved entirely against itself.
   */
  private validateParameterLocaleAlignment(en: CategoryParameter[], ur: CategoryParameter[]) {
    if (en.length === 0 || ur.length === 0) return;

    if (en.length !== ur.length) {
      throw new BadRequestException(
        this.i18n.translate("auth.category.parameters_locale_mismatch", { lang: this.lang }),
      );
    }

    for (let index = 0; index < en.length; index++) {
      if (!!en[index].dependsOn !== !!ur[index].dependsOn) {
        throw new BadRequestException(
          this.i18n.translate("auth.category.parameters_locale_mismatch", { lang: this.lang }),
        );
      }
    }
  }

  private extractNameFromKeyedObject(item: Record<string, any>): string {
    const numericKeys = Object.keys(item)
      .filter((key) => /^\d+$/.test(key))
      .sort((a, b) => Number(a) - Number(b));

    if (numericKeys.length > 0) {
      return numericKeys
        .map((key) => item[key])
        .filter((value) => typeof value === "string")
        .join("")
        .trim();
    }

    const fallback = Object.entries(item).find(([key, value]) => {
      return typeof value === "string" && !["values", "_id", "id"].includes(key);
    });

    return fallback?.[1]?.trim?.() || "";
  }

  /**
   * Check duplicate name (supports both string and object).
   *
   * `name` is a JSONB column, so what was a "name.en" dotted path in Mongo is a
   * JSON path filter here. Postgres evaluates it server-side exactly the same way.
   */
  private async checkDuplicateName(nameInput: any, excludeId?: string) {
    let nameEn: string | undefined;
    let nameUr: string | undefined;

    // Handle object format (from Category)
    if (typeof nameInput === "object" && nameInput !== null) {
      nameEn = nameInput.en?.trim();
      nameUr = nameInput.ur?.trim();
    }
    // Handle string format (from CategoryRequest)
    else if (typeof nameInput === "string") {
      nameEn = nameInput.trim();
    }

    if (!nameEn && !nameUr) return;

    const base: Prisma.CategoryWhereInput = {
      isDisabled: false,
      ...(excludeId ? { id: { not: excludeId } } : {}),
    };

    if (nameEn) {
      const existingEn = await this.prisma.category.findFirst({
        where: { ...base, name: { path: ["en"], equals: nameEn } },
        select: { id: true },
      });
      if (existingEn) {
        throw new ConflictException(
          this.i18n.translate("auth.category.name_already_exists", { lang: this.lang }),
        );
      }
    }

    if (nameUr) {
      const existingUr = await this.prisma.category.findFirst({
        where: { ...base, name: { path: ["ur"], equals: nameUr } },
        select: { id: true },
      });
      if (existingUr) {
        throw new ConflictException(
          this.i18n.translate("auth.category.urdu_name_already_exists", { lang: this.lang }),
        );
      }
    }
  }

  /** A sort number must be unique within its own type (product/service) Ã¢â‚¬â€ the two
   *  types are sorted/displayed independently, so the same number can be reused
   *  across types but not within one. */
  private async checkDuplicateSortNumber(
    sortNumber: number | undefined,
    type: string | undefined,
    excludeId?: string,
  ) {
    if (sortNumber === undefined || sortNumber === null || !type) return;

    const existing = await this.prisma.category.findFirst({
      where: {
        isDisabled: false,
        type: type as CategoryType,
        sortNumber: Number(sortNumber),
        ...(excludeId ? { id: { not: excludeId } } : {}),
      },
      select: { id: true },
    });

    if (existing) {
      throw new ConflictException(
        `Sort number ${sortNumber} is already used by another ${type} category`,
      );
    }
  }

  async create(dto: CreateUpdateCategoryDto) {
    await this.checkDuplicateName(dto.name);
    await this.checkDuplicateSortNumber(dto.sortNumber, dto.type);

    return this.prisma.category.create({
      data: {
        id: generateObjectId(),
        name: dto.name as Prisma.InputJsonValue,
        description: (dto.description ?? {}) as Prisma.InputJsonValue,
        parameters: this.normalizeParameters(dto.parameters) as unknown as Prisma.InputJsonValue,
        sortNumber: Number(dto.sortNumber ?? 0),
        icon: dto.icon ?? null,
        type: dto.type as CategoryType,
        isDisabled: dto.isDisabled ?? false,
        isDraft: dto.isDraft ?? false,
      },
    });
  }

  async update(id: string, dto: CreateUpdateCategoryDto): Promise<Category> {
    await this.checkDuplicateName(dto.name, id);
    await this.checkDuplicateSortNumber(dto.sortNumber, dto.type, id);

    const existing = await this.prisma.category.findUnique({ where: { id } });
    if (!existing) {
      throw new NotFoundException(
        this.i18n.translate("auth.category.category_not_found", { lang: this.lang }),
      );
    }

    return this.prisma.category.update({
      where: { id },
      data: {
        ...(dto.name !== undefined ? { name: dto.name as Prisma.InputJsonValue } : {}),
        ...(dto.description !== undefined
          ? { description: dto.description as Prisma.InputJsonValue }
          : {}),
        // Was unconditional, so a PUT that simply omitted `parameters` (e.g.
        // the admin's activate/deactivate toggle, which sends only
        // isDisabled) wiped every parameter to `{en:[],ur:[]}`. Conditional
        // like every other field on this method.
        ...(dto.parameters !== undefined
          ? {
              parameters: this.normalizeParameters(
                dto.parameters,
              ) as unknown as Prisma.InputJsonValue,
            }
          : {}),
        ...(dto.sortNumber !== undefined ? { sortNumber: Number(dto.sortNumber) } : {}),
        ...(dto.icon !== undefined ? { icon: dto.icon } : {}),
        ...(dto.type !== undefined ? { type: dto.type as CategoryType } : {}),
        ...(dto.isDisabled !== undefined ? { isDisabled: dto.isDisabled } : {}),
        ...(dto.isDraft !== undefined ? { isDraft: dto.isDraft } : {}),
      },
    });
  }

  async findAllForAdmin(startDate?: string, endDate?: string) {
    const where: Prisma.CategoryWhereInput = {};

    if (startDate || endDate) {
      const createdAt: Prisma.DateTimeFilter = {};
      if (startDate) createdAt.gte = new Date(startDate);
      if (endDate) {
        const endOfDay = new Date(endDate);
        endOfDay.setHours(23, 59, 59, 999);
        createdAt.lte = endOfDay;
      }
      where.createdAt = createdAt;
    }

    return this.prisma.category.findMany({ where, orderBy: { sortNumber: "asc" } });
  }

  async findAll(type?: string) {
    const categories = await this.prisma.category.findMany({
      where: { isDisabled: false, isDraft: false, ...(type ? { type: type as CategoryType } : {}) },
      orderBy: { sortNumber: "asc" },
    });

    return {
      data: categories.map((cat) => ({
        ...cat,
        name: this.getLocalizedValue(cat?.name, this.lang),
        description: this.getLocalizedValue(cat?.description, this.lang),
        parameters: this.normalizeParameters(cat?.parameters),
      })),
      message: this.i18n.translate("category.fetched_success", { lang: this.lang }),
    };
  }

  async findById(id: string, lang: string = "en") {
    const category = await this.prisma.category.findFirst({
      where: { id, isDisabled: false, isDraft: false },
    });

    if (!category)
      throw new NotFoundException(
        this.i18n.translate("auth.category.category_not_found", { lang }),
      );

    return {
      ...category,
      parameters: this.normalizeParameters(category?.parameters),
    };
  }

  /** Soft delete Ã¢â‚¬â€ the row stays so listings referencing it keep resolving. */
  async delete(id: string): Promise<void> {
    const existing = await this.prisma.category.findUnique({ where: { id } });
    if (!existing)
      throw new NotFoundException(
        this.i18n.translate("auth.category.category_not_found", { lang: this.lang }),
      );

    await this.prisma.category.update({ where: { id }, data: { isDisabled: true } });
  }

  async createRequest(createDto: CreateCategoryRequestDto, userId: string) {
    return this.prisma.categoryRequest.create({
      data: {
        id: generateObjectId(),
        name: createDto.name,
        description: createDto.description ?? null,
        requestedById: userId,
      },
    });
  }

  async getPendingRequests() {
    // Was .populate("requestedBy", "name email").
    return this.prisma.categoryRequest.findMany({
      where: { status: "pending" },
      include: {
        requestedBy: { select: { id: true, name: true, email: true } },
      },
    });
  }

  async reviewRequestById(
    id: string,
    reviewDto: ReviewCategoryRequestDto,
    adminId: string,
  ) {
    const request = await this.prisma.categoryRequest.findUnique({ where: { id } });
    if (!request)
      throw new NotFoundException(
        this.i18n.translate("auth.category.request_not_found", { lang: this.lang }),
      );

    const updated = await this.prisma.categoryRequest.update({
      where: { id },
      data: {
        status: reviewDto.status,
        adminComment: reviewDto.adminComment || "",
        reviewedById: adminId,
        reviewedAt: new Date(),
      },
    });

    if (reviewDto.status === "approved") {
      // Safely handles the plain string name a CategoryRequest carries.
      await this.checkDuplicateName(request.name);

      await this.prisma.category.create({
        data: {
          id: generateObjectId(),
          // A request only ever captures an English name; the Urdu side is
          // filled in later from the admin category editor.
          name: { en: request.name } as Prisma.InputJsonValue,
          description: (request.description
            ? { en: request.description }
            : {}) as Prisma.InputJsonValue,
          // The old code passed `createdBy`, which the Category schema never
          // declared, so Mongoose silently dropped it. Not carried over.
          type: CategoryType.PRODUCT,
        },
      });
    }

    return updated;
  }

  async getUserRequests(userId: string) {
    return this.prisma.categoryRequest.findMany({ where: { requestedById: userId } });
  }

  /** English -> Urdu translation via MyMemory's free public API (no API key required). */
  async translate(text: string): Promise<string> {
    const trimmed = text?.trim();
    if (!trimmed) return "";

    const params = new URLSearchParams({
      q: trimmed,
      langpair: "en|ur",
      de: "amitywise18@gmail.com",
    });
    const response = await fetch(
      `https://api.mymemory.translated.net/get?${params.toString()}`,
    );
    if (!response.ok) {
      throw new BadRequestException("Translation service is unavailable right now");
    }
    const data = await response.json();
    const translated = data?.responseData?.translatedText;
    if (typeof translated !== "string" || !translated) {
      throw new BadRequestException("Translation failed");
    }
    return translated;
  }
}
