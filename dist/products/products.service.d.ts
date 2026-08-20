import { Model } from "mongoose";
import { I18nService } from "nestjs-i18n";
import { Product, ProductDocument } from "./schema/product.schema";
import { CounterDocument } from "src/common/schema/counter.schema";
import { CreateProductDto } from "./dto/create-product.dto";
import { UpdateProductDto } from "./dto/update-product.dto";
import { PaginationDto } from "src/common/dto/pagination.dto";
import { PaginatedResponseDto } from "src/common/dto/pagination-response.dto";
import { ShopService } from "src/shop/shop.service";
import { ListingUtilsService } from "src/shared/listing-util-service";
import { UsersService } from "src/users/users.service";
import { SearchAllProductsServiceDto } from "src/search/dto/product-service-search-for.dto";
import { FileUploadService } from "src/common/file-upload/file-upload.service";
import { PromotionService } from "src/promotion/promotion.service";
import { ClsService } from "nestjs-cls";
import { LikeService } from "src/like/like.service";
import { ReviewService } from "src/reviews/reviews.service";
import { PermissionEntry } from "src/common/constants/admin-permissions.constants";
import { ActivityLogService } from "src/activity-log/activity-log.service";
export declare class ProductsService {
    private readonly productModel;
    private readonly counterModel;
    private readonly shopService;
    private readonly listingUtils;
    private readonly userService;
    private readonly fileUploadService;
    private promotionService;
    private readonly i18n;
    private readonly cls;
    private readonly likeService;
    private readonly reviewService;
    private readonly activityLogService;
    constructor(productModel: Model<ProductDocument>, counterModel: Model<CounterDocument>, shopService: ShopService, listingUtils: ListingUtilsService, userService: UsersService, fileUploadService: FileUploadService, promotionService: PromotionService, i18n: I18nService, cls: ClsService, likeService: LikeService, reviewService: ReviewService, activityLogService: ActivityLogService);
    private get lang();
    private parseAndValidateLocation;
    private generateNextListingCode;
    private generateNextVideoCode;
    create(entityId: string, type: "shop" | "personal", dto: CreateProductDto): Promise<{
        message: string;
        data: {
            product: Product;
        };
    }>;
    getAllProductsByShop(shopId: string, paginationDto: PaginationDto): Promise<PaginatedResponseDto<Product>>;
    getAllProductsByUser(ownerId: string, paginationDto: PaginationDto): Promise<PaginatedResponseDto<Product>>;
    getById(id: string, userId?: string): Promise<any>;
    update(productId: string, updateDto: UpdateProductDto, currentUser?: {
        sub: string;
        roles?: string[];
        permissions?: PermissionEntry[];
    }): Promise<any>;
    delete(productId: string, currentUser?: {
        sub: string;
        roles?: string[];
        permissions?: PermissionEntry[];
    }, lang?: string, ipAddress?: string): Promise<import("mongoose").Document<unknown, {}, ProductDocument, {}> & Product & import("mongoose").Document<unknown, any, any, Record<string, any>> & Required<{
        _id: unknown;
    }> & {
        __v: number;
    }>;
    deleteProductMedia(productId: string, media: string[], currentUser?: {
        sub: string;
        roles?: string[];
        permissions?: PermissionEntry[];
    }): Promise<boolean>;
    searchNearbyWithCategory(category: string, coordinates: [number, number], radius: number, pagination: PaginationDto): Promise<PaginatedResponseDto<ProductDocument>>;
    getAllForAdmin(paginationDto: PaginationDto, search?: string): Promise<PaginatedResponseDto<Product>>;
    updateStatus(productId: string, isDisabled: boolean): Promise<{
        message: string;
        data: import("mongoose").Document<unknown, {}, ProductDocument, {}> & Product & import("mongoose").Document<unknown, any, any, Record<string, any>> & Required<{
            _id: unknown;
        }> & {
            __v: number;
        };
    }>;
    findNearbyProductShopOwnerIds(categoryId: string, coordinates: [number, number], radiusInMeters: number): Promise<string[]>;
    updateLocationByShopId(shopId: string, location: {
        type: "Point";
        coordinates: [number, number];
    }): Promise<void>;
    setDisabledByShop(shopId: string, disabled: boolean): Promise<void>;
    setProductsDisabledByShopsBulk(shopIds: any[], disabled: boolean): Promise<void>;
    setProductsDisabledByUser(userId: string, disabled: boolean): Promise<void>;
    searchProducts(query: SearchAllProductsServiceDto): Promise<{
        data: {
            promotions: any[];
            items: any[];
        };
        meta: {
            total: number;
            page: number;
            limit: number;
            totalPages: number;
        };
    }>;
    private enrichProductsWithReviewStats;
    getProductsWithVideos(paginationDto: PaginationDto & {
        search?: string;
    }, userId?: string, category?: string): Promise<PaginatedResponseDto<any>>;
    getProductsWithVideosForAdmin(page?: number, limit?: number, search?: string, startDate?: string, endDate?: string): Promise<PaginatedResponseDto<any>>;
    setProductDisabled(productId: string, disabled: boolean): Promise<import("mongoose").Document<unknown, {}, ProductDocument, {}> & Product & import("mongoose").Document<unknown, any, any, Record<string, any>> & Required<{
        _id: unknown;
    }> & {
        __v: number;
    }>;
}
