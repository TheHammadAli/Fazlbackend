// src/categories/category.service.ts
import { Injectable, NotFoundException, ConflictException, BadRequestException } from "@nestjs/common";
import { InjectModel } from "@nestjs/mongoose";
import { Category, CategoryDocument } from "./schema/category.schema";
import { FilterQuery, Model, Types } from "mongoose";
import { I18nService } from "nestjs-i18n";
import { CreateUpdateCategoryDto } from "./dto/category-create-update.dto";
import {
  CategoryRequest,
  CategoryRequestDocument,
} from "./schema/category-request.schema";
import { CreateCategoryRequestDto } from "./dto/category-request.dto";
import { ReviewCategoryRequestDto } from "./dto/review-category.dto";
import { ClsService } from "nestjs-cls";

@Injectable()
export class CategoryService {
  constructor(
    @InjectModel(Category.name)
    private categoryModel: Model<CategoryDocument>,
    @InjectModel(CategoryRequest.name)
    private categoryRequestModel: Model<CategoryRequestDocument>,
    private readonly i18n: I18nService,
    private readonly cls: ClsService,
  ) { }

  private getLocalizedValue = (
    field: Record<string, string> | undefined,
    lang = "en",
  ) => {
    return field?.[lang] || field?.["en"] || "";
  };

  private get lang(): string {
    return this.cls?.get("lang") ?? "en";
  }

  /**
   * Safely handles both string (JSON) and object for parameters field
   */
  private normalizeParameters(parameters: any): any {
    if (!parameters) return {};

    if (typeof parameters === "object" && parameters !== null && !Array.isArray(parameters)) {
      return parameters;
    }

    if (typeof parameters === "string") {
      try {
        const parsed = JSON.parse(parameters);
        if (typeof parsed === "object" && parsed !== null && !Array.isArray(parsed)) {
          return parsed;
        }
      } catch (e) {
        throw new BadRequestException(
          this.i18n.translate("category.invalid_parameters_format", { lang: this.lang })
        );
      }
    }

    throw new BadRequestException(
      this.i18n.translate("category.invalid_parameters_format", { lang: this.lang })
    );
  }

  /**
   * Check duplicate name (supports both string and object)
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

    const query: any = { isDisabled: false };

    if (excludeId) {
      query._id = { $ne: excludeId };
    }

    // Check English name
    if (nameEn) {
      const existingEn = await this.categoryModel.findOne({
        ...query,
        "name.en": nameEn,
      });
      if (existingEn) {
        throw new ConflictException(
          this.i18n.translate("auth.category.name_already_exists", { lang: this.lang })
        );
      }
    }

    // Check Urdu name (only if available)
    if (nameUr) {
      const existingUr = await this.categoryModel.findOne({
        ...query,
        "name.ur": nameUr,
      });
      if (existingUr) {
        throw new ConflictException(
          this.i18n.translate("auth.category.urdu_name_already_exists", { lang: this.lang })
        );
      }
    }
  }

  async create(dto: CreateUpdateCategoryDto) {
    try {
      await this.checkDuplicateName(dto.name);

      const normalizedDto = {
        ...dto,
        parameters: this.normalizeParameters(dto.parameters),
      };

      return await this.categoryModel.create(normalizedDto);
    } catch (error: any) {
      if (error.code === 11000 || error instanceof ConflictException) {
        throw error;
      }

      if (error.name === "ValidationError") {
        throw new BadRequestException(
          this.i18n.translate("category.validation_failed", { lang: this.lang })
        );
      }

      throw error;
    }
  }

  async update(
    id: string,
    dto: CreateUpdateCategoryDto,
  ): Promise<Category> {
    try {
      await this.checkDuplicateName(dto.name, id);

      const normalizedDto = {
        ...dto,
        parameters: this.normalizeParameters(dto.parameters),
      };

      const updated = await this.categoryModel.findByIdAndUpdate(
        id,
        normalizedDto,
        { new: true, runValidators: true },
      );

      if (!updated) {
        throw new NotFoundException(
          this.i18n.translate("auth.category.category_not_found", { lang: this.lang })
        );
      }

      return updated;
    } catch (error: any) {
      if (error.code === 11000 || error instanceof ConflictException) {
        throw error;
      }

      if (error.name === "ValidationError") {
        throw new BadRequestException(
          this.i18n.translate("auth.category.validation_failed", { lang: this.lang })
        );
      }

      throw error;
    }
  }

  async findAllForAdmin() {
    return this.categoryModel.find().sort({ sortNumber: 1 }).lean().exec();
  }

  async findAll(type?: string) {
    const filter: FilterQuery<CategoryDocument> = { isDisabled: false };
    if (type) {
      filter.type = type;
    }

    const categories = await this.categoryModel.find(filter).sort({ sortNumber: 1 }).lean().exec();

    return {
      data: categories.map((cat) => ({
        ...cat,
        name: this.getLocalizedValue(cat?.name, this.lang),
        description: this.getLocalizedValue(cat?.description, this.lang),
      })),
      message: this.i18n.translate("category.fetched_success", { lang: this.lang }),
    };
  }

  async findById(id: string, lang: string = "en") {
    const category = await this.categoryModel
      .findOne({ _id: id, isDisabled: false })
      .lean()
      .exec();

    if (!category)
      throw new NotFoundException(
        this.i18n.translate("auth.category.category_not_found", { lang }),
      );

    return category;
  }

  async delete(id: string): Promise<void> {
    const result = await this.categoryModel.findById(id);
    if (!result)
      throw new NotFoundException(
        this.i18n.translate("auth.category.category_not_found", { lang: this.lang }),
      );

    await this.categoryModel.updateOne({ _id: id }, { isDisabled: true }).exec();
  }

  async createRequest(createDto: CreateCategoryRequestDto, userId: string) {
    return this.categoryRequestModel.create({
      ...createDto,
      requestedBy: userId,
    });
  }

  async getPendingRequests() {
    try {
      const results = await this.categoryRequestModel
        .find({ status: "pending" })
        .populate("requestedBy", "name email");

      return results;
    } catch (err) {
      console.error("Error populating category requests:", err);
      throw err;
    }
  }

  async reviewRequestById(
    id: string,
    reviewDto: ReviewCategoryRequestDto,
    adminId: string,
  ) {
    const request = await this.categoryRequestModel.findById(id);
    if (!request) throw new NotFoundException(this.i18n.translate("auth.category.request_not_found", { lang: this.lang }));

    request.status = reviewDto.status;
    request.adminComment = reviewDto.adminComment || "";
    request.reviewedBy = new Types.ObjectId(adminId);
    request.reviewedAt = new Date();

    await request.save();

    if (reviewDto.status === "approved") {
      // Fixed: Now safely handles string name from CategoryRequest
      await this.checkDuplicateName(request.name);

      await this.categoryModel.create({
        name: request.name,
        description: request.description,
        createdBy: adminId,
      });
    }

    return request;
  }

  async getUserRequests(userId: string) {
    return this.categoryRequestModel.find({ requestedBy: userId });
  }
}