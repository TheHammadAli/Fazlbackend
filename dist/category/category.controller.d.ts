import { CategoryService } from "./category.service";
import { CreateUpdateCategoryDto } from "./dto/category-create-update.dto";
import { CreateCategoryRequestDto } from "./dto/category-request.dto";
import { JwtPayload } from "src/auth/strategies/jwt-strategy";
import { ReviewCategoryRequestDto } from "./dto/review-category.dto";
import { FileUploadService } from "src/common/file-upload/file-upload.service";
export declare class CategoryController {
    private readonly categoryService;
    private readonly fileUploadService;
    constructor(categoryService: CategoryService, fileUploadService: FileUploadService);
    create(dto: CreateUpdateCategoryDto, icon?: any): Promise<import("./schema/category.schema").Category>;
    findAll(type?: string): Promise<{
        data: {
            name: string;
            description: string;
            isDisabled: boolean;
            icon?: string;
            type: import("./schema/category.schema").CategoryType;
            _id: unknown;
            $locals: Record<string, unknown>;
            $op: "save" | "validate" | "remove" | null;
            $where: Record<string, unknown>;
            baseModelName?: string;
            collection: import("mongoose").Collection;
            db: import("mongoose").Connection;
            errors?: import("mongoose").Error.ValidationError;
            id?: any;
            isNew: boolean;
            schema: import("mongoose").Schema;
            __v: number;
        }[];
        message: string;
    }>;
    findById(id: string): Promise<import("./schema/category.schema").Category>;
    update(id: string, dto: CreateUpdateCategoryDto, icon?: any): Promise<import("./schema/category.schema").Category>;
    createRequest(dto: CreateCategoryRequestDto, user: JwtPayload): Promise<import("mongoose").Document<unknown, {}, import("./schema/category-request.schema").CategoryRequestDocument, {}> & import("./schema/category-request.schema").CategoryRequest & import("mongoose").Document<unknown, any, any, Record<string, any>> & Required<{
        _id: unknown;
    }> & {
        __v: number;
    }>;
    getPendingRequests(): Promise<(import("mongoose").Document<unknown, {}, import("./schema/category-request.schema").CategoryRequestDocument, {}> & import("./schema/category-request.schema").CategoryRequest & import("mongoose").Document<unknown, any, any, Record<string, any>> & Required<{
        _id: unknown;
    }> & {
        __v: number;
    })[]>;
    reviewRequest(id: string, dto: ReviewCategoryRequestDto, user: JwtPayload): Promise<import("mongoose").Document<unknown, {}, import("./schema/category-request.schema").CategoryRequestDocument, {}> & import("./schema/category-request.schema").CategoryRequest & import("mongoose").Document<unknown, any, any, Record<string, any>> & Required<{
        _id: unknown;
    }> & {
        __v: number;
    }>;
}
