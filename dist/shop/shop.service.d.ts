import { Model, Types } from "mongoose";
import { PaginationDto } from "src/common/dto/pagination.dto";
import { PaginatedResponseDto } from "src/common/dto/pagination-response.dto";
import { I18nService } from "nestjs-i18n";
import { Shop, ShopDocument } from "./schema/shop.schema";
import { CreateUpdateShopDto } from "./dto/create-update-shop.dto";
import { ProductsService } from "src/products/products.service";
import { UsersService } from "src/users/users.service";
import { FileUploadService } from "src/common/file-upload/file-upload.service";
import { ClsService } from "nestjs-cls";
import { OrdersService } from "src/orders/orders.service";
export declare class ShopService {
    private shopModel;
    private readonly productsService;
    private readonly usersService;
    private readonly fileUploadService;
    private readonly ordersService;
    private readonly i18n;
    private readonly cls;
    constructor(shopModel: Model<ShopDocument>, productsService: ProductsService, usersService: UsersService, fileUploadService: FileUploadService, ordersService: OrdersService, i18n: I18nService, cls: ClsService);
    private get lang();
    createShop(ownerId: Types.ObjectId, dto: CreateUpdateShopDto): Promise<{
        message: string;
        data: import("mongoose").Document<unknown, {}, ShopDocument, {}> & Shop & import("mongoose").Document<unknown, any, any, Record<string, any>> & Required<{
            _id: unknown;
        }> & {
            __v: number;
        };
    }>;
    updateShop(shopId: string, dto: CreateUpdateShopDto): Promise<{
        message: string;
        data: Shop;
    }>;
    getShopById(shopId: string): Promise<{
        productsCount: number;
        ordersCount: number;
        ownerId: Types.ObjectId;
        title: string;
        image: string;
        banner: string;
        address: string;
        description: string;
        isDisabled?: boolean | undefined;
        location: import("mongoose").FlattenMaps<{
            type: "Point";
            coordinates: [number, number];
        }>;
        _id: import("mongoose").FlattenMaps<unknown>;
        $assertPopulated: <Paths = {}>(path: string | string[], values?: Partial<Paths> | undefined) => Omit<Shop & import("mongoose").Document<unknown, any, any, Record<string, any>> & Required<{
            _id: unknown;
        }> & {
            __v: number;
        }, keyof Paths> & Paths;
        $clearModifiedPaths: () => Shop & import("mongoose").Document<unknown, any, any, Record<string, any>> & Required<{
            _id: unknown;
        }> & {
            __v: number;
        };
        $clone: () => Shop & import("mongoose").Document<unknown, any, any, Record<string, any>> & Required<{
            _id: unknown;
        }> & {
            __v: number;
        };
        $createModifiedPathsSnapshot: () => import("mongoose").ModifiedPathsSnapshot;
        $getAllSubdocs: () => import("mongoose").Document[];
        $ignore: (path: string) => void;
        $isDefault: (path: string) => boolean;
        $isDeleted: (val?: boolean) => boolean;
        $getPopulatedDocs: () => import("mongoose").Document[];
        $inc: (path: string | string[], val?: number) => Shop & import("mongoose").Document<unknown, any, any, Record<string, any>> & Required<{
            _id: unknown;
        }> & {
            __v: number;
        };
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
        $restoreModifiedPathsSnapshot: (snapshot: import("mongoose").ModifiedPathsSnapshot) => Shop & import("mongoose").Document<unknown, any, any, Record<string, any>> & Required<{
            _id: unknown;
        }> & {
            __v: number;
        };
        $session: (session?: import("mongoose").ClientSession | null) => import("mongoose").ClientSession | null;
        $set: {
            (path: string | Record<string, any>, val: any, type: any, options?: import("mongoose").DocumentSetOptions): Shop & import("mongoose").Document<unknown, any, any, Record<string, any>> & Required<{
                _id: unknown;
            }> & {
                __v: number;
            };
            (path: string | Record<string, any>, val: any, options?: import("mongoose").DocumentSetOptions): Shop & import("mongoose").Document<unknown, any, any, Record<string, any>> & Required<{
                _id: unknown;
            }> & {
                __v: number;
            };
            (value: string | Record<string, any>): Shop & import("mongoose").Document<unknown, any, any, Record<string, any>> & Required<{
                _id: unknown;
            }> & {
                __v: number;
            };
        };
        $where: import("mongoose").FlattenMaps<Record<string, unknown>>;
        baseModelName?: string | undefined;
        collection: import("mongoose").Collection;
        db: import("mongoose").FlattenMaps<import("mongoose").Connection>;
        deleteOne: (options?: import("mongoose").QueryOptions) => any;
        depopulate: <Paths = {}>(path?: string | string[]) => import("mongoose").MergeType<Shop & import("mongoose").Document<unknown, any, any, Record<string, any>> & Required<{
            _id: unknown;
        }> & {
            __v: number;
        }, Paths>;
        directModifiedPaths: () => Array<string>;
        equals: (doc: import("mongoose").Document<unknown, any, any, Record<string, any>>) => boolean;
        errors?: import("mongoose").Error.ValidationError | undefined;
        get: {
            <T extends string | number | symbol>(path: T, type?: any, options?: any): any;
            (path: string, type?: any, options?: any): any;
        };
        getChanges: () => import("mongoose").UpdateQuery<Shop & import("mongoose").Document<unknown, any, any, Record<string, any>> & Required<{
            _id: unknown;
        }> & {
            __v: number;
        }>;
        id?: any;
        increment: () => Shop & import("mongoose").Document<unknown, any, any, Record<string, any>> & Required<{
            _id: unknown;
        }> & {
            __v: number;
        };
        init: (obj: import("mongoose").AnyObject, opts?: import("mongoose").AnyObject) => Shop & import("mongoose").Document<unknown, any, any, Record<string, any>> & Required<{
            _id: unknown;
        }> & {
            __v: number;
        };
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
        overwrite: (obj: import("mongoose").AnyObject) => Shop & import("mongoose").Document<unknown, any, any, Record<string, any>> & Required<{
            _id: unknown;
        }> & {
            __v: number;
        };
        $parent: () => import("mongoose").Document | undefined;
        populate: {
            <Paths = {}>(path: string | import("mongoose").PopulateOptions | (string | import("mongoose").PopulateOptions)[]): Promise<import("mongoose").MergeType<Shop & import("mongoose").Document<unknown, any, any, Record<string, any>> & Required<{
                _id: unknown;
            }> & {
                __v: number;
            }, Paths>>;
            <Paths = {}>(path: string, select?: string | import("mongoose").AnyObject, model?: Model<any>, match?: import("mongoose").AnyObject, options?: import("mongoose").PopulateOptions): Promise<import("mongoose").MergeType<Shop & import("mongoose").Document<unknown, any, any, Record<string, any>> & Required<{
                _id: unknown;
            }> & {
                __v: number;
            }, Paths>>;
        };
        populated: (path: string) => any;
        replaceOne: (replacement?: import("mongoose").AnyObject, options?: import("mongoose").QueryOptions | null) => import("mongoose").Query<any, Shop & import("mongoose").Document<unknown, any, any, Record<string, any>> & Required<{
            _id: unknown;
        }> & {
            __v: number;
        }, {}, unknown, "find", Record<string, never>>;
        save: (options?: import("mongoose").SaveOptions) => Promise<Shop & import("mongoose").Document<unknown, any, any, Record<string, any>> & Required<{
            _id: unknown;
        }> & {
            __v: number;
        }>;
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
            <T extends string | number | symbol>(path: T, val: any, type: any, options?: import("mongoose").DocumentSetOptions): Shop & import("mongoose").Document<unknown, any, any, Record<string, any>> & Required<{
                _id: unknown;
            }> & {
                __v: number;
            };
            (path: string | Record<string, any>, val: any, type: any, options?: import("mongoose").DocumentSetOptions): Shop & import("mongoose").Document<unknown, any, any, Record<string, any>> & Required<{
                _id: unknown;
            }> & {
                __v: number;
            };
            (path: string | Record<string, any>, val: any, options?: import("mongoose").DocumentSetOptions): Shop & import("mongoose").Document<unknown, any, any, Record<string, any>> & Required<{
                _id: unknown;
            }> & {
                __v: number;
            };
            (value: string | Record<string, any>): Shop & import("mongoose").Document<unknown, any, any, Record<string, any>> & Required<{
                _id: unknown;
            }> & {
                __v: number;
            };
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
        updateOne: (update?: import("mongoose").UpdateWithAggregationPipeline | import("mongoose").UpdateQuery<Shop & import("mongoose").Document<unknown, any, any, Record<string, any>> & Required<{
            _id: unknown;
        }> & {
            __v: number;
        }> | undefined, options?: import("mongoose").QueryOptions | null) => import("mongoose").Query<any, Shop & import("mongoose").Document<unknown, any, any, Record<string, any>> & Required<{
            _id: unknown;
        }> & {
            __v: number;
        }, {}, unknown, "find", Record<string, never>>;
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
    }>;
    getAllShopsByUser(userId: string): Promise<Shop[]>;
    setShopDisabled(shopId: string, disabled: boolean): Promise<void>;
    setShopsDisabledBulk(shopIds: any[], disabled: boolean): Promise<void>;
    findShopsNearLocation(location: [number, number], radiusInMeters: number): Promise<Shop[]>;
    findShopsNearLocationPaginated(location: [number, number], radiusInMeters: number, pagination?: PaginationDto): Promise<PaginatedResponseDto<Shop>>;
}
