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
exports.SearchNearbyShopDto = void 0;
const swagger_1 = require("@nestjs/swagger");
const class_transformer_1 = require("class-transformer");
const class_validator_1 = require("class-validator");
class SearchNearbyShopDto {
    category;
    lat;
    lng;
    radius;
    page = 1;
    limit = 10;
}
exports.SearchNearbyShopDto = SearchNearbyShopDto;
__decorate([
    (0, swagger_1.ApiPropertyOptional)({ example: "66a1b2c3d4e5f67890123456", description: "Optional category or tag id to filter shops" }),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsString)(),
    __metadata("design:type", String)
], SearchNearbyShopDto.prototype, "category", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({ example: 33.6844, description: "Latitude coordinate" }),
    (0, class_transformer_1.Type)(() => Number),
    (0, class_validator_1.IsNumber)(),
    __metadata("design:type", Number)
], SearchNearbyShopDto.prototype, "lat", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({ example: 73.0479, description: "Longitude coordinate" }),
    (0, class_transformer_1.Type)(() => Number),
    (0, class_validator_1.IsNumber)(),
    __metadata("design:type", Number)
], SearchNearbyShopDto.prototype, "lng", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({ example: 10, description: "Search radius in kilometers" }),
    (0, class_transformer_1.Type)(() => Number),
    (0, class_validator_1.IsNumber)(),
    __metadata("design:type", Number)
], SearchNearbyShopDto.prototype, "radius", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)({ example: 1, description: "Page number for pagination" }),
    (0, class_validator_1.IsOptional)(),
    (0, class_transformer_1.Type)(() => Number),
    (0, class_validator_1.IsNumber)(),
    __metadata("design:type", Number)
], SearchNearbyShopDto.prototype, "page", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)({ example: 10, description: "Number of results per page" }),
    (0, class_validator_1.IsOptional)(),
    (0, class_transformer_1.Type)(() => Number),
    (0, class_validator_1.IsNumber)(),
    __metadata("design:type", Number)
], SearchNearbyShopDto.prototype, "limit", void 0);
//# sourceMappingURL=search-nearby-shop.dto.js.map