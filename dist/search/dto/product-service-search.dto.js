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
exports.SearchQueryDto = void 0;
const class_validator_1 = require("class-validator");
const class_transformer_1 = require("class-transformer");
const swagger_1 = require("@nestjs/swagger");
class SearchQueryDto {
    type;
    category;
    radius;
    lat;
    lng;
    page = 1;
    limit = 10;
}
exports.SearchQueryDto = SearchQueryDto;
__decorate([
    (0, swagger_1.ApiProperty)({ enum: ["product", "service"], example: "product" }),
    (0, class_validator_1.IsIn)(["product", "service"]),
    __metadata("design:type", String)
], SearchQueryDto.prototype, "type", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)({ example: "electronics" }),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsString)(),
    __metadata("design:type", String)
], SearchQueryDto.prototype, "category", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({ example: 10, description: "Search radius in kilometers" }),
    (0, class_transformer_1.Type)(() => Number),
    (0, class_validator_1.IsNumber)(),
    __metadata("design:type", Number)
], SearchQueryDto.prototype, "radius", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({ example: 33.6844, description: "Latitude coordinate" }),
    (0, class_transformer_1.Type)(() => Number),
    (0, class_validator_1.IsNumber)(),
    __metadata("design:type", Number)
], SearchQueryDto.prototype, "lat", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({ example: 73.0479, description: "Longitude coordinate" }),
    (0, class_transformer_1.Type)(() => Number),
    (0, class_validator_1.IsNumber)(),
    __metadata("design:type", Number)
], SearchQueryDto.prototype, "lng", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)({ example: 1, description: "Pagination: page number" }),
    (0, class_validator_1.IsOptional)(),
    (0, class_transformer_1.Type)(() => Number),
    (0, class_validator_1.IsNumber)(),
    __metadata("design:type", Number)
], SearchQueryDto.prototype, "page", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)({
        example: 10,
        description: "Pagination: limit per page",
    }),
    (0, class_validator_1.IsOptional)(),
    (0, class_transformer_1.Type)(() => Number),
    (0, class_validator_1.IsNumber)(),
    __metadata("design:type", Number)
], SearchQueryDto.prototype, "limit", void 0);
//# sourceMappingURL=product-service-search.dto.js.map