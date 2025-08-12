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
Object.defineProperty(exports, "__esModule", { value: true });
exports.SearchAllProductsServiceDto = void 0;
const swagger_1 = require("@nestjs/swagger");
class SearchAllProductsServiceDto {
    name;
    category;
    page;
    limit;
}
exports.SearchAllProductsServiceDto = SearchAllProductsServiceDto;
__decorate([
    (0, swagger_1.ApiPropertyOptional)({ description: 'Product name to search for', example: 'iPhone' }),
    __metadata("design:type", String)
], SearchAllProductsServiceDto.prototype, "name", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)({ description: 'Category of the product', example: 'electronics' }),
    __metadata("design:type", String)
], SearchAllProductsServiceDto.prototype, "category", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)({ description: 'Page number for pagination', example: 1 }),
    __metadata("design:type", Number)
], SearchAllProductsServiceDto.prototype, "page", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)({ description: 'Number of results per page', example: 20 }),
    __metadata("design:type", Number)
], SearchAllProductsServiceDto.prototype, "limit", void 0);
//# sourceMappingURL=product-service-search-for.dto.js.map