import { CategoryService } from "./category.service";
import { CreateUpdateCategoryDto } from "./dto/category-create-update.dto";
import { CreateCategoryRequestDto } from "./dto/category-request.dto";
import { JwtPayload } from "src/auth/strategies/jwt-strategy";
import { ReviewCategoryRequestDto } from "./dto/review-category.dto";
export declare class CategoryController {
    private readonly categoryService;
    constructor(categoryService: CategoryService);
    create(dto: CreateUpdateCategoryDto): Promise<import("./schema/category.schema").Category>;
    findAll(): Promise<{
        data: {
            name: string;
            isDisabled: boolean;
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
    update(id: string, dto: CreateUpdateCategoryDto): Promise<import("./schema/category.schema").Category>;
    delete(id: string): Promise<void>;
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
