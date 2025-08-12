import { Category, CategoryDocument } from './schema/category.schema';
import { Model } from 'mongoose';
import { CreateUpdateCategoryDto } from './dto/category-create-update.dto';
import { CategoryRequest, CategoryRequestDocument } from './schema/category-request.schema';
import { CreateCategoryRequestDto } from './dto/category-request.dto';
import { ReviewCategoryRequestDto } from './dto/review-category.dto';
export declare class CategoryService {
    private categoryModel;
    private categoryRequestModel;
    constructor(categoryModel: Model<CategoryDocument>, categoryRequestModel: Model<CategoryRequestDocument>);
    create(dto: CreateUpdateCategoryDto): Promise<Category>;
    findAll(): Promise<Category[]>;
    findById(id: string): Promise<Category>;
    update(id: string, dto: CreateUpdateCategoryDto): Promise<Category>;
    delete(id: string): Promise<void>;
    createRequest(createDto: CreateCategoryRequestDto, userId: string): Promise<import("mongoose").Document<unknown, {}, CategoryRequestDocument, {}> & CategoryRequest & import("mongoose").Document<unknown, any, any, Record<string, any>> & Required<{
        _id: unknown;
    }> & {
        __v: number;
    }>;
    getPendingRequests(): Promise<(import("mongoose").Document<unknown, {}, CategoryRequestDocument, {}> & CategoryRequest & import("mongoose").Document<unknown, any, any, Record<string, any>> & Required<{
        _id: unknown;
    }> & {
        __v: number;
    })[]>;
    reviewRequestById(id: string, reviewDto: ReviewCategoryRequestDto, adminId: string): Promise<import("mongoose").Document<unknown, {}, CategoryRequestDocument, {}> & CategoryRequest & import("mongoose").Document<unknown, any, any, Record<string, any>> & Required<{
        _id: unknown;
    }> & {
        __v: number;
    }>;
    getUserRequests(userId: string): Promise<(import("mongoose").Document<unknown, {}, CategoryRequestDocument, {}> & CategoryRequest & import("mongoose").Document<unknown, any, any, Record<string, any>> & Required<{
        _id: unknown;
    }> & {
        __v: number;
    })[]>;
}
