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
exports.CreateProductDto = void 0;
const class_validator_1 = require("class-validator");
const class_transformer_1 = require("class-transformer");
const swagger_1 = require("@nestjs/swagger");
class ProductParameterDto {
    name;
    variants;
}
__decorate([
    (0, swagger_1.ApiProperty)({ example: "Color" }),
    (0, class_validator_1.IsString)(),
    __metadata("design:type", String)
], ProductParameterDto.prototype, "name", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({ example: ["Red", "Blue"], type: [String] }),
    (0, class_validator_1.IsArray)(),
    (0, class_validator_1.IsString)({ each: true }),
    __metadata("design:type", Array)
], ProductParameterDto.prototype, "variants", void 0);
class CreateProductDto {
    title;
    description;
    price;
    category;
    type;
    images;
    video;
    parameters;
}
exports.CreateProductDto = CreateProductDto;
__decorate([
    (0, swagger_1.ApiProperty)({ example: "Wireless Mouse" }),
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.IsNotEmpty)(),
    __metadata("design:type", String)
], CreateProductDto.prototype, "title", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)({ example: "Ergonomic wireless mouse" }),
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.IsOptional)(),
    __metadata("design:type", String)
], CreateProductDto.prototype, "description", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({ example: 1999 }),
    (0, class_validator_1.IsNumber)(),
    __metadata("design:type", Number)
], CreateProductDto.prototype, "price", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({ example: "electronics" }),
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.IsNotEmpty)(),
    __metadata("design:type", String)
], CreateProductDto.prototype, "category", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({
        example: "retail",
        enum: ["retail", "classified"],
        description: "Product Type",
    }),
    __metadata("design:type", String)
], CreateProductDto.prototype, "type", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)({
        type: [String],
        example: ["https://img.com/p1.jpg", "https://img.com/p2.jpg"],
    }),
    (0, swagger_1.ApiProperty)({
        type: "string",
        format: "binary",
        isArray: true,
        description: "Upload multiple images",
    }),
    __metadata("design:type", Object)
], CreateProductDto.prototype, "images", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({
        type: "string",
        format: "binary",
        isArray: true,
        description: "Upload One video file",
        maximum: 1,
    }),
    (0, class_validator_1.IsNotEmpty)(),
    __metadata("design:type", Object)
], CreateProductDto.prototype, "video", void 0);
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
], CreateProductDto.prototype, "parameters", void 0);
//# sourceMappingURL=create-product.dto.js.map