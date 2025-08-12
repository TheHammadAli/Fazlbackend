import { Model } from 'mongoose';
import { Product, ProductDocument } from './schema/product.schema';
import { CreateProductDto } from './dto/create-product.dto';
import { UpdateProductDto } from './dto/update-product.dto';
import { PaginationDto } from 'src/common/dto/pagination.dto';
import { PaginatedResponseDto } from 'src/common/dto/pagination-response.dto';
import { ShopService } from 'src/shop/shop.service';
import { ListingUtilsService } from 'src/shared/listing-util-service';
import { UsersService } from 'src/users/users.service';
import { SearchAllProductsServiceDto } from 'src/search/dto/product-service-search-for.dto';
import { FileUploadService } from 'src/common/file-upload/file-upload.service';
export declare class ProductsService {
    private readonly productModel;
    private readonly shopService;
    private readonly listingUtils;
    private readonly userService;
    private readonly fileUploadService;
    constructor(productModel: Model<ProductDocument>, shopService: ShopService, listingUtils: ListingUtilsService, userService: UsersService, fileUploadService: FileUploadService);
    create(entityId: string, type: 'shop' | 'personal', dto: CreateProductDto, files: {
        images?: Express.Multer.File[];
    }): Promise<Product>;
    getAllProductsByShop(shopId: string, paginationDto: PaginationDto): Promise<PaginatedResponseDto<Product>>;
    getAllProductsByUser(ownerId: string, paginationDto: PaginationDto): Promise<PaginatedResponseDto<Product>>;
    getById(id: string): Promise<Product>;
    update(productId: string, updateDto: UpdateProductDto): Promise<Product>;
    delete(productId: string): Promise<void>;
    searchNearbyWithCategory(category: string, coordinates: [number, number], radius: number, pagination: PaginationDto): Promise<PaginatedResponseDto<ProductDocument>>;
    updateLocationByShopId(shopId: string, location: {
        type: 'Point';
        coordinates: [number, number];
    }): Promise<void>;
    searchProducts(query: SearchAllProductsServiceDto): Promise<PaginatedResponseDto<Product>>;
}
