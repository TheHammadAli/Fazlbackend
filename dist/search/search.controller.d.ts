import { SearchService } from "./search.service";
import { ProductsService } from "src/products/products.service";
import { ServicesService } from "src/services/services.service";
import { SearchAllProductsServiceDto } from "./dto/product-service-search-for.dto";
export declare class SearchController {
    private readonly searchService;
    private readonly productsService;
    private readonly servicesService;
    constructor(searchService: SearchService, productsService: ProductsService, servicesService: ServicesService);
    autocomplete(query: string): Promise<any[]>;
    searchNearby(type: "product" | "service", category: string, radius: string, latitude: string, longitude: string, page?: string, limit?: string): Promise<import("../common/dto/pagination-response.dto").PaginatedResponseDto<import("../products/schema/product.schema").ProductDocument> | import("../common/dto/pagination-response.dto").PaginatedResponseDto<import("../services/schema/services.schema").ServiceDocument>>;
    searchAllProducts(query: SearchAllProductsServiceDto): Promise<{
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
    searchAllServices(query: SearchAllProductsServiceDto): Promise<{
        meta: {
            total: number;
            page: number;
            limit: number;
            totalPages: number;
        };
        data: any[];
    }>;
}
