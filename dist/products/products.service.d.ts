import { Model } from "mongoose";
import { I18nService } from "nestjs-i18n";
import { Product, ProductDocument } from "./schema/product.schema";
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
export declare class ProductsService {
    private readonly productModel;
    private readonly shopService;
    private readonly listingUtils;
    private readonly userService;
    private readonly fileUploadService;
    private promotionService;
    private readonly i18n;
    private readonly cls;
    private readonly likeService;
    private readonly reviewService;
    constructor(productModel: Model<ProductDocument>, shopService: ShopService, listingUtils: ListingUtilsService, userService: UsersService, fileUploadService: FileUploadService, promotionService: PromotionService, i18n: I18nService, cls: ClsService, likeService: LikeService, reviewService: ReviewService);
    private get lang();
    create(entityId: string, type: "shop" | "personal", dto: CreateProductDto): Promise<{
        message: string;
        data: {
            product: Product;
        };
    }>;
    getAllProductsByShop(shopId: string, paginationDto: PaginationDto): Promise<PaginatedResponseDto<Product>>;
    getAllProductsByUser(ownerId: string, paginationDto: PaginationDto): Promise<PaginatedResponseDto<Product>>;
    getById(id: string): Promise<Product>;
    update(productId: string, updateDto: UpdateProductDto): Promise<any>;
    delete(productId: string, lang?: string): Promise<void>;
    deleteProductMedia(productId: string, media: string[]): Promise<boolean>;
    searchNearbyWithCategory(category: string, coordinates: [number, number], radius: number, pagination: PaginationDto): Promise<PaginatedResponseDto<ProductDocument>>;
    updateLocationByShopId(shopId: string, location: {
        type: "Point";
        coordinates: [number, number];
    }): Promise<void>;
    setDisabledByShop(shopId: string, disabled: boolean): Promise<void>;
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
    getProductsWithVideos(paginationDto: PaginationDto, userId: string, category?: string): Promise<PaginatedResponseDto<any>>;
}
