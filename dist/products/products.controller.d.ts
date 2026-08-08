import { ProductsService } from "./products.service";
import { CreateProductDto } from "./dto/create-product.dto";
import { UpdateProductDto } from "./dto/update-product.dto";
import { PaginationDto } from "src/common/dto/pagination.dto";
import { Product } from "./schema/product.schema";
import { PaginatedResponseDto } from "src/common/dto/pagination-response.dto";
import { UpdateProductStatusDto } from "./dto/update-product-status.dto";
import { Request } from "express";
import { GetWithVideosDto } from "src/services/dto/video-with-dto";
export declare class ProductsController {
    private readonly productsService;
    constructor(productsService: ProductsService);
    createProduct(entityId: string, type: "shop" | "personal", req: Request, createProductDto: CreateProductDto, files: {
        images?: Express.Multer.File[];
        video?: Express.Multer.File[];
    }): Promise<{
        message: string;
        data: {
            success: boolean;
        };
    }>;
    getAllByShop(shopId: string, paginationDto: PaginationDto): Promise<PaginatedResponseDto<Product>>;
    deleteProductMedia(productId: string, media: string[]): Promise<{
        message: string;
    }>;
    getAllProductsByUser(userId: string, paginationDto: PaginationDto): Promise<PaginatedResponseDto<Product>>;
    getProductsWithVideos(query: GetWithVideosDto): Promise<PaginatedResponseDto<Product>>;
    getById(id: string, userId?: string): Promise<any>;
    update(id: string, updateProductDto: UpdateProductDto, files: {
        images?: Express.Multer.File[];
        video?: Express.Multer.File[];
    }): Promise<Product>;
    delete(id: string): Promise<{
        message: string;
    }>;
    getAllForAdmin(paginationDto: PaginationDto, search?: string): Promise<PaginatedResponseDto<Product>>;
    updateStatus(id: string, dto: UpdateProductStatusDto): Promise<{
        message: string;
        data: import("mongoose").Document<unknown, {}, import("./schema/product.schema").ProductDocument, {}> & Product & import("mongoose").Document<unknown, any, any, Record<string, any>> & Required<{
            _id: unknown;
        }> & {
            __v: number;
        };
    }>;
}
