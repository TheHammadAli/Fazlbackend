import { SearchService } from './search.service';
import { ProductsService } from 'src/products/products.service';
import { ServicesService } from 'src/services/services.service';
import { SearchAllProductsServiceDto } from './dto/product-service-search-for.dto';
export declare class SearchController {
    private readonly searchService;
    private readonly productsService;
    private readonly servicesService;
    constructor(searchService: SearchService, productsService: ProductsService, servicesService: ServicesService);
    searchNearby(type: 'product' | 'service', category: string, radius: string, latitude: string, longitude: string, page?: string, limit?: string): Promise<import("../common/dto/pagination-response.dto").PaginatedResponseDto<import("../services/schema/services.schema").ServiceDocument> | import("../common/dto/pagination-response.dto").PaginatedResponseDto<import("../products/schema/product.schema").ProductDocument>>;
    searchAllProducts(query: SearchAllProductsServiceDto): Promise<import("../common/dto/pagination-response.dto").PaginatedResponseDto<import("../products/schema/product.schema").Product>>;
    searchAllServices(query: SearchAllProductsServiceDto): Promise<{
        meta: {
            total: number;
            page: number;
            limit: number;
            totalPages: number;
        };
        data: (import("mongoose").Document<unknown, {}, import("../services/schema/services.schema").ServiceDocument, {}> & import("../services/schema/services.schema").Service & import("mongoose").Document<unknown, any, any, Record<string, any>> & Required<{
            _id: unknown;
        }> & {
            __v: number;
        })[];
    }>;
}
