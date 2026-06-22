// src/categories/category.service.ts
import { Injectable, NotFoundException } from "@nestjs/common";
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

  async create(dto: CreateUpdateCategoryDto) {
    return new this.categoryModel({ ...dto }).save();
  }

  async findAll(type?: string) {

    const filter: FilterQuery<CategoryDocument> = { isDisabled: false };
    if (type) {
      filter.type = type;
    }
    const categories = await this.categoryModel.find(filter).lean().exec();

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
    const category = await this.categoryModel.findOne({ _id: id, isDisabled: false }).lean().exec();
    if (!category)
      throw new NotFoundException(
        this.i18n.translate("auth.category.category_not_found", { lang }),
      );
    return category;
  }

  async update(
    id: string,
    dto: CreateUpdateCategoryDto,

  ): Promise<Category> {
    const updated = await this.categoryModel.findByIdAndUpdate(id, { ...dto }, {
      new: true,
    });
    if (!updated)
      throw new NotFoundException(
        this.i18n.translate("category.category_not_found", { lang: this.lang }),
      );
    return updated;
  }

  async delete(id: string): Promise<void> {
    const result = await this.categoryModel.findById(id);
    if (!result)
      throw new NotFoundException(
        this.i18n.translate("category.category_not_found", { lang: this.lang }),
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
    if (!request) throw new NotFoundException("Request not found");

    request.status = reviewDto.status;
    request.adminComment = reviewDto.adminComment || "";
    request.reviewedBy = new Types.ObjectId(adminId);
    request.reviewedAt = new Date();

    await request.save();

    if (reviewDto.status === "approved") {
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
