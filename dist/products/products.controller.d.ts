import { ProductsService } from "./products.service";
import { CreateProductDto } from "./dto/create-product.dto";
import { UpdateProductDto } from "./dto/update-product.dto";
import { PaginationDto } from "src/common/dto/pagination.dto";
import { Product } from "./schema/product.schema";
import { PaginatedResponseDto } from "src/common/dto/pagination-response.dto";
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
            product: Product;
        };
    }>;
    getAllByShop(shopId: string, paginationDto: PaginationDto): Promise<PaginatedResponseDto<Product>>;
    deleteProductMedia(productId: string, media: string[]): Promise<{
        message: string;
    }>;
    getAllProductsByUser(userId: string, paginationDto: PaginationDto): Promise<PaginatedResponseDto<Product>>;
    getProductsWithVideos(query: GetWithVideosDto, userId: string): Promise<PaginatedResponseDto<Product>>;
    getById(id: string): Promise<Product>;
    update(id: string, updateProductDto: UpdateProductDto, files: {
        images?: Express.Multer.File[];
        video?: Express.Multer.File[];
    }): Promise<Product>;
    delete(id: string): Promise<{
        message: string;
    }>;
}
