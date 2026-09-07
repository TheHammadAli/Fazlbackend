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
  VIDEO_POST_CATEGORY_NAME,
  type Category,
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
   * { en: [{ name, values }], ur: [{ name, values }] }
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
          this.i18n.translate("category.invalid_parameters_format", { lang: this.lang }),
        );
      }
    }

    if (typeof parameters !== "object" || parameters === null || Array.isArray(parameters)) {
      throw new BadRequestException(
        this.i18n.translate("category.invalid_parameters_format", { lang: this.lang }),
      );
    }

    const normalized: Record<string, any> = {};

    for (const lang of ["en", "ur"] as const) {
      const rawValue = parameters?.[lang];
      normalized[lang] = this.normalizeParameterList(rawValue);
    }

    return normalized as CategoryParameters;
  }

  private normalizeParameterList(value: any): Array<{ name: string; values: string[] }> {
    if (!value) return [];

    if (Array.isArray(value)) {
      return value.map((item) => this.normalizeParameterItem(item));
    }

    if (typeof value === "object") {
      return [this.normalizeParameterItem(value)];
    }

    return [];
  }

  private normalizeParameterItem(item: any): { name: string; values: string[] } {
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

    return {
      name: rawName?.trim?.() || "",
      values: rawValues,
    };
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

  /** A sort number must be unique within its own type (product/service) — the two
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
        parameters: this.normalizeParameters(dto.parameters) as unknown as Prisma.InputJsonValue,
        ...(dto.sortNumber !== undefined ? { sortNumber: Number(dto.sortNumber) } : {}),
        ...(dto.icon !== undefined ? { icon: dto.icon } : {}),
        ...(dto.type !== undefined ? { type: dto.type as CategoryType } : {}),
        ...(dto.isDisabled !== undefined ? { isDisabled: dto.isDisabled } : {}),
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
      where: { isDisabled: false, ...(type ? { type: type as CategoryType } : {}) },
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
      where: { id, isDisabled: false },
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

  /** Soft delete — the row stays so listings referencing it keep resolving. */
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

  /** Sentinel category for lightweight "just a video" product posts, which don't
   *  collect a real category from the owner. Query ignores `isDisabled` so this
   *  stays idempotent even if it were ever re-enabled; `isDisabled: true` on
   *  create is what keeps it out of every user-facing category picker/listing
   *  (`findAll`/`findById` above both filter on `isDisabled: false`) while still
   *  resolving normally through the `category` relation elsewhere. */
  async findOrCreateVideoPostCategory(): Promise<Category> {
    const existing = await this.prisma.category.findFirst({
      where: {
        name: { path: ["en"], equals: VIDEO_POST_CATEGORY_NAME },
        type: CategoryType.PRODUCT,
      },
    });
    if (existing) return existing;

    return this.prisma.category.create({
      data: {
        id: generateObjectId(),
        name: { en: VIDEO_POST_CATEGORY_NAME, ur: "ویڈیو پوسٹ" } as Prisma.InputJsonValue,
        type: CategoryType.PRODUCT,
        isDisabled: true,
      },
    });
  }
}
