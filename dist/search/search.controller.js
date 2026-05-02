"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
var __param = (this && this.__param) || function (paramIndex, decorator) {
    return function (target, key) { decorator(target, key, paramIndex); }
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.SearchController = void 0;
const common_1 = require("@nestjs/common");
const search_service_1 = require("./search.service");
const products_service_1 = require("../products/products.service");
const services_service_1 = require("../services/services.service");
const product_service_search_for_dto_1 = require("./dto/product-service-search-for.dto");
const swagger_1 = require("@nestjs/swagger");
let SearchController = class SearchController {
    searchService;
    productsService;
    servicesService;
    constructor(searchService, productsService, servicesService) {
        this.searchService = searchService;
        this.productsService = productsService;
        this.servicesService = servicesService;
    }
    async autocomplete(query) {
        return this.searchService.autocompleteLocations(query);
    }
    async searchNearby(type, category, radius, latitude, longitude, page = "1", limit = "10") {
        if (!["product", "service"].includes(type)) {
            throw new common_1.BadRequestException('Type must be "product" or "service"');
        }
        const parsedRadius = parseFloat(radius);
        const parsedLatitude = parseFloat(latitude);
        const parsedLongitude = parseFloat(longitude);
        const parsedPage = parseInt(page, 10);
        const parsedLimit = parseInt(limit, 10);
        if (isNaN(parsedRadius) ||
            isNaN(parsedLatitude) ||
            isNaN(parsedLongitude)) {
            throw new common_1.BadRequestException("Invalid or missing location parameters");
        }
        if (type === "product") {
            return this.productsService.searchNearbyWithCategory(category, [parsedLatitude, parsedLongitude], parsedRadius, { page: parsedPage, limit: parsedLimit });
        }
        return this.servicesService.searchNearbyWithCategory(category, [parsedLatitude, parsedLongitude], parsedRadius, { page: parsedPage, limit: parsedLimit });
    }
    async searchAllProducts(query) {
        console.log("Search query:", query);
        const { name, category, page = 1, limit = 20 } = query;
        if (page < 1 || limit < 1) {
            throw new common_1.BadRequestException("Page and limit must be greater than 0");
        }
        return this.productsService.searchProducts({
            name,
            category,
            page,
            limit,
        });
    }
    async searchAllServices(query) {
        console.log("Search query:", query);
        const { name, category, page = 1, limit = 20 } = query;
        if (page < 1 || limit < 1) {
            throw new common_1.BadRequestException("Page and limit must be greater than 0");
        }
        return this.servicesService.searchServices({
            name,
            category,
            page,
            limit,
        });
    }
};
exports.SearchController = SearchController;
__decorate([
    (0, common_1.Get)("autocomplete-locations"),
    (0, swagger_1.ApiOperation)({
        summary: "Get location autocomplete suggestions from Google Places API",
    }),
    (0, swagger_1.ApiQuery)({
        name: "q",
        type: String,
        required: true,
        description: "Search query (e.g. partial city or address)",
    }),
    __param(0, (0, common_1.Query)("q")),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", Promise)
], SearchController.prototype, "autocomplete", null);
__decorate([
    (0, common_1.Get)(),
    __param(0, (0, common_1.Query)("type")),
    __param(1, (0, common_1.Query)("category")),
    __param(2, (0, common_1.Query)("radius")),
    __param(3, (0, common_1.Query)("latitude")),
    __param(4, (0, common_1.Query)("longitude")),
    __param(5, (0, common_1.Query)("page")),
    __param(6, (0, common_1.Query)("limit")),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String, String, String, String, Object, Object]),
    __metadata("design:returntype", Promise)
], SearchController.prototype, "searchNearby", null);
__decorate([
    (0, common_1.Get)("all-products"),
    __param(0, (0, common_1.Query)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [product_service_search_for_dto_1.SearchAllProductsServiceDto]),
    __metadata("design:returntype", Promise)
], SearchController.prototype, "searchAllProducts", null);
__decorate([
    (0, common_1.Get)("all-services"),
    __param(0, (0, common_1.Query)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [product_service_search_for_dto_1.SearchAllProductsServiceDto]),
    __metadata("design:returntype", Promise)
], SearchController.prototype, "searchAllServices", null);
exports.SearchController = SearchController = __decorate([
    (0, common_1.Controller)("search"),
    __metadata("design:paramtypes", [search_service_1.SearchService,
        products_service_1.ProductsService,
        services_service_1.ServicesService])
], SearchController);
//# sourceMappingURL=search.controller.js.map