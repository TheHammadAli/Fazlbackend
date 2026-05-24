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
exports.UpdateProductDto = void 0;
const class_validator_1 = require("class-validator");
const class_transformer_1 = require("class-transformer");
const swagger_1 = require("@nestjs/swagger");
class ProductParameterDto {
    name;
    variants;
}
__decorate([
    (0, swagger_1.ApiPropertyOptional)({ example: "Color" }),
    (0, class_validator_1.IsString)(),
    __metadata("design:type", String)
], ProductParameterDto.prototype, "name", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)({ example: ["Red", "Blue"] }),
    (0, class_validator_1.IsArray)(),
    (0, class_validator_1.IsString)({ each: true }),
    __metadata("design:type", Array)
], ProductParameterDto.prototype, "variants", void 0);
class UpdateProductDto {
    title;
    description;
    type;
    price;
    category;
    images;
    video;
    parameters;
}
exports.UpdateProductDto = UpdateProductDto;
__decorate([
    (0, swagger_1.ApiPropertyOptional)({ example: "Updated Product Title" }),
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.IsOptional)(),
    __metadata("design:type", String)
], UpdateProductDto.prototype, "title", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)({ example: "Updated product description" }),
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.IsOptional)(),
    __metadata("design:type", String)
], UpdateProductDto.prototype, "description", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)({
        example: "retail",
        enum: ["retail", "classified"],
        description: "Product Type",
    }),
    __metadata("design:type", String)
], UpdateProductDto.prototype, "type", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)({ example: 2999 }),
    (0, class_validator_1.IsNumber)(),
    (0, class_validator_1.IsOptional)(),
    __metadata("design:type", Number)
], UpdateProductDto.prototype, "price", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)({ example: "fashion" }),
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.IsOptional)(),
    __metadata("design:type", String)
], UpdateProductDto.prototype, "category", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)({
        type: [String],
        example: ["https://img.com/p1.jpg", "https://img.com/p2.jpg"],
    }),
    (0, swagger_1.ApiPropertyOptional)({
        type: "string",
        format: "binary",
        isArray: true,
        description: "Upload multiple images",
    }),
    __metadata("design:type", Object)
], UpdateProductDto.prototype, "images", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)({
        type: "string",
        format: "binary",
        isArray: true,
        description: "Upload One video file",
        maximum: 1,
    }),
    __metadata("design:type", Object)
], UpdateProductDto.prototype, "video", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)({
        type: [ProductParameterDto],
        example: [
            { name: "Color", variants: ["Red", "Blue"] },
        ],
        description: "Custom product parameters like size, color, etc.",
    }),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsArray)(),
    (0, class_validator_1.ValidateNested)({ each: true }),
    (0, class_transformer_1.Type)(() => ProductParameterDto),
    __metadata("design:type", Array)
], UpdateProductDto.prototype, "parameters", void 0);
//# sourceMappingURL=update-product.dto.js.map