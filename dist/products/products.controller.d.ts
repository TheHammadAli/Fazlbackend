import { ProductsService } from './products.service';
import { CreateProductDto } from './dto/create-product.dto';
import { UpdateProductDto } from './dto/update-product.dto';
import { PaginationDto } from 'src/common/dto/pagination.dto';
import { Product } from './schema/product.schema';
import { PaginatedResponseDto } from 'src/common/dto/pagination-response.dto';
import { FileUploadService } from 'src/common/file-upload/file-upload.service';
export declare class ProductsController {
    private readonly productsService;
    private readonly fileUploadService;
    constructor(productsService: ProductsService, fileUploadService: FileUploadService);
    createProduct(entityId: string, type: 'shop' | 'personal', createProductDto: CreateProductDto, files: {
        images?: Express.Multer.File[];
        video?: Express.Multer.File[];
    }): Promise<Product>;
    getAllByShop(shopId: string, paginationDto: PaginationDto): Promise<PaginatedResponseDto<Product>>;
    getAllProductsByUser(userId: string, paginationDto: PaginationDto): Promise<PaginatedResponseDto<Product>>;
    getById(id: string): Promise<Product>;
    update(id: string, updateProductDto: UpdateProductDto): Promise<Product>;
    delete(id: string): Promise<{
        message: string;
    }>;
}
