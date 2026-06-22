import { Category, CategoryDocument } from "./schema/category.schema";
import { Model, Types } from "mongoose";
import { I18nService } from "nestjs-i18n";
import { CreateUpdateCategoryDto } from "./dto/category-create-update.dto";
import { CategoryRequest, CategoryRequestDocument } from "./schema/category-request.schema";
import { CreateCategoryRequestDto } from "./dto/category-request.dto";
import { ReviewCategoryRequestDto } from "./dto/review-category.dto";
import { ClsService } from "nestjs-cls";
export declare class CategoryService {
    private categoryModel;
    private categoryRequestModel;
    private readonly i18n;
    private readonly cls;
    constructor(categoryModel: Model<CategoryDocument>, categoryRequestModel: Model<CategoryRequestDocument>, i18n: I18nService, cls: ClsService);
    private getLocalizedValue;
    private get lang();
    create(dto: CreateUpdateCategoryDto): Promise<import("mongoose").Document<unknown, {}, CategoryDocument, {}> & Category & import("mongoose").Document<unknown, any, any, Record<string, any>> & Required<{
        _id: unknown;
    }> & {
        __v: number;
    }>;
    findAll(type?: string): Promise<{
        data: {
            name: string;
            description: string;
            parameters?: import("mongoose").FlattenMaps<{
                en: string[];
                ur: string[];
            }> | undefined;
            isDisabled: boolean;
            icon?: string | undefined;
            type: import("./schema/category.schema").CategoryType;
            _id: import("mongoose").FlattenMaps<unknown>;
            $assertPopulated: <Paths = {}>(path: string | string[], values?: Partial<Paths> | undefined) => Omit<CategoryDocument, keyof Paths> & Paths;
            $clearModifiedPaths: () => CategoryDocument;
            $clone: () => CategoryDocument;
            $createModifiedPathsSnapshot: () => import("mongoose").ModifiedPathsSnapshot;
            $getAllSubdocs: () => import("mongoose").Document[];
            $ignore: (path: string) => void;
            $isDefault: (path: string) => boolean;
            $isDeleted: (val?: boolean) => boolean;
            $getPopulatedDocs: () => import("mongoose").Document[];
            $inc: (path: string | string[], val?: number) => CategoryDocument;
            $isEmpty: (path: string) => boolean;
            $isValid: (path: string) => boolean;
            $locals: import("mongoose").FlattenMaps<Record<string, unknown>>;
            $markValid: (path: string) => void;
            $model: {
                <ModelType = Model<unknown, {}, {}, {}, import("mongoose").Document<unknown, {}, unknown, {}> & {
                    _id: Types.ObjectId;
                } & {
                    __v: number;
                }, any>>(name: string): ModelType;
                <ModelType = Model<any, {}, {}, {}, any, any>>(): ModelType;
            };
            $op: "save" | "validate" | "remove" | null;
            $restoreModifiedPathsSnapshot: (snapshot: import("mongoose").ModifiedPathsSnapshot) => CategoryDocument;
            $session: (session?: import("mongoose").ClientSession | null) => import("mongoose").ClientSession | null;
            $set: {
                (path: string | Record<string, any>, val: any, type: any, options?: import("mongoose").DocumentSetOptions): CategoryDocument;
                (path: string | Record<string, any>, val: any, options?: import("mongoose").DocumentSetOptions): CategoryDocument;
                (value: string | Record<string, any>): CategoryDocument;
            };
            $where: import("mongoose").FlattenMaps<Record<string, unknown>>;
            baseModelName?: string | undefined;
            collection: import("mongoose").Collection;
            db: import("mongoose").FlattenMaps<import("mongoose").Connection>;
            deleteOne: (options?: import("mongoose").QueryOptions) => any;
            depopulate: <Paths = {}>(path?: string | string[]) => import("mongoose").MergeType<CategoryDocument, Paths>;
            directModifiedPaths: () => Array<string>;
            equals: (doc: import("mongoose").Document<unknown, any, any, Record<string, any>>) => boolean;
            errors?: import("mongoose").Error.ValidationError | undefined;
            get: {
                <T extends string | number | symbol>(path: T, type?: any, options?: any): any;
                (path: string, type?: any, options?: any): any;
            };
            getChanges: () => import("mongoose").UpdateQuery<CategoryDocument>;
            id?: any;
            increment: () => CategoryDocument;
            init: (obj: import("mongoose").AnyObject, opts?: import("mongoose").AnyObject) => CategoryDocument;
            invalidate: {
                <T extends string | number | symbol>(path: T, errorMsg: string | NativeError, value?: any, kind?: string): NativeError | null;
                (path: string, errorMsg: string | NativeError, value?: any, kind?: string): NativeError | null;
            };
            isDirectModified: {
                <T extends string | number | symbol>(path: T | T[]): boolean;
                (path: string | Array<string>): boolean;
            };
            isDirectSelected: {
                <T extends string | number | symbol>(path: T): boolean;
                (path: string): boolean;
            };
            isInit: {
                <T extends string | number | symbol>(path: T): boolean;
                (path: string): boolean;
            };
            isModified: {
                <T extends string | number | symbol>(path?: T | T[] | undefined, options?: {
                    ignoreAtomics?: boolean;
                } | null): boolean;
                (path?: string | Array<string>, options?: {
                    ignoreAtomics?: boolean;
                } | null): boolean;
            };
            isNew: boolean;
            isSelected: {
                <T extends string | number | symbol>(path: T): boolean;
                (path: string): boolean;
            };
            markModified: {
                <T extends string | number | symbol>(path: T, scope?: any): void;
                (path: string, scope?: any): void;
            };
            model: {
                <ModelType = Model<unknown, {}, {}, {}, import("mongoose").Document<unknown, {}, unknown, {}> & {
                    _id: Types.ObjectId;
                } & {
                    __v: number;
                }, any>>(name: string): ModelType;
                <ModelType = Model<any, {}, {}, {}, any, any>>(): ModelType;
            };
            modifiedPaths: (options?: {
                includeChildren?: boolean;
            }) => Array<string>;
            overwrite: (obj: import("mongoose").AnyObject) => CategoryDocument;
            $parent: () => import("mongoose").Document | undefined;
            populate: {
                <Paths = {}>(path: string | import("mongoose").PopulateOptions | (string | import("mongoose").PopulateOptions)[]): Promise<import("mongoose").MergeType<CategoryDocument, Paths>>;
                <Paths = {}>(path: string, select?: string | import("mongoose").AnyObject, model?: Model<any>, match?: import("mongoose").AnyObject, options?: import("mongoose").PopulateOptions): Promise<import("mongoose").MergeType<CategoryDocument, Paths>>;
            };
            populated: (path: string) => any;
            replaceOne: (replacement?: import("mongoose").AnyObject, options?: import("mongoose").QueryOptions | null) => import("mongoose").Query<any, CategoryDocument, {}, unknown, "find", Record<string, never>>;
            save: (options?: import("mongoose").SaveOptions) => Promise<CategoryDocument>;
            schema: import("mongoose").FlattenMaps<import("mongoose").Schema<any, Model<any, any, any, any, any, any>, {}, {}, {}, {}, import("mongoose").DefaultSchemaOptions, {
                [x: string]: unknown;
            }, import("mongoose").Document<unknown, {}, import("mongoose").FlatRecord<{
                [x: string]: unknown;
            }>, {}> & import("mongoose").FlatRecord<{
                [x: string]: unknown;
            }> & Required<{
                _id: unknown;
            }> & {
                __v: number;
            }>>;
            set: {
                <T extends string | number | symbol>(path: T, val: any, type: any, options?: import("mongoose").DocumentSetOptions): CategoryDocument;
                (path: string | Record<string, any>, val: any, type: any, options?: import("mongoose").DocumentSetOptions): CategoryDocument;
                (path: string | Record<string, any>, val: any, options?: import("mongoose").DocumentSetOptions): CategoryDocument;
                (value: string | Record<string, any>): CategoryDocument;
            };
            toJSON: {
                (options: import("mongoose").ToObjectOptions & {
                    virtuals: true;
                }): any;
                (options?: import("mongoose").ToObjectOptions & {
                    flattenMaps?: true;
                    flattenObjectIds?: false;
                }): import("mongoose").FlattenMaps<any>;
                (options: import("mongoose").ToObjectOptions & {
                    flattenObjectIds: false;
                }): import("mongoose").FlattenMaps<any>;
                (options: import("mongoose").ToObjectOptions & {
                    flattenObjectIds: true;
                }): {
                    [x: string]: any;
                };
                (options: import("mongoose").ToObjectOptions & {
                    flattenMaps: false;
                }): any;
                (options: import("mongoose").ToObjectOptions & {
                    flattenMaps: false;
                    flattenObjectIds: true;
                }): any;
                <T = any>(options?: import("mongoose").ToObjectOptions & {
                    flattenMaps?: true;
                    flattenObjectIds?: false;
                }): import("mongoose").FlattenMaps<T>;
                <T = any>(options: import("mongoose").ToObjectOptions & {
                    flattenObjectIds: false;
                }): import("mongoose").FlattenMaps<T>;
                <T = any>(options: import("mongoose").ToObjectOptions & {
                    flattenObjectIds: true;
                }): import("mongoose").ObjectIdToString<import("mongoose").FlattenMaps<T>>;
                <T = any>(options: import("mongoose").ToObjectOptions & {
                    flattenMaps: false;
                }): T;
                <T = any>(options: import("mongoose").ToObjectOptions & {
                    flattenMaps: false;
                    flattenObjectIds: true;
                }): import("mongoose").ObjectIdToString<T>;
            };
            toObject: {
                (options: import("mongoose").ToObjectOptions & {
                    virtuals: true;
                }): any;
                (options?: import("mongoose").ToObjectOptions): any;
                <T>(options?: import("mongoose").ToObjectOptions): import("mongoose").Default__v<import("mongoose").Require_id<T>>;
            };
            unmarkModified: {
                <T extends string | number | symbol>(path: T): void;
                (path: string): void;
            };
            updateOne: (update?: import("mongoose").UpdateWithAggregationPipeline | import("mongoose").UpdateQuery<CategoryDocument> | undefined, options?: import("mongoose").QueryOptions | null) => import("mongoose").Query<any, CategoryDocument, {}, unknown, "find", Record<string, never>>;
            validate: {
                <T extends string | number | symbol>(pathsToValidate?: T | T[] | undefined, options?: import("mongoose").AnyObject): Promise<void>;
                (pathsToValidate?: import("mongoose").pathsToValidate, options?: import("mongoose").AnyObject): Promise<void>;
                (options: {
                    pathsToSkip?: import("mongoose").pathsToSkip;
                }): Promise<void>;
            };
            validateSync: {
                (options: {
                    pathsToSkip?: import("mongoose").pathsToSkip;
                    [k: string]: any;
                }): import("mongoose").Error.ValidationError | null;
                <T extends string | number | symbol>(pathsToValidate?: T | T[] | undefined, options?: import("mongoose").AnyObject): import("mongoose").Error.ValidationError | null;
                (pathsToValidate?: import("mongoose").pathsToValidate, options?: import("mongoose").AnyObject): import("mongoose").Error.ValidationError | null;
            };
            __v: number;
        }[];
        message: string;
    }>;
    findById(id: string, lang?: string): Promise<import("mongoose").FlattenMaps<CategoryDocument> & Required<{
        _id: import("mongoose").FlattenMaps<unknown>;
    }> & {
        __v: number;
    }>;
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
