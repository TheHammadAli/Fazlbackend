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
exports.CreateUpdateCategoryDto = void 0;
const class_validator_1 = require("class-validator");
const class_transformer_1 = require("class-transformer");
const swagger_1 = require("@nestjs/swagger");
const category_schema_1 = require("../schema/category.schema");
class CategoryParametersDto {
    en;
    ur;
}
__decorate([
    (0, swagger_1.ApiProperty)({ example: ["Size", "Color"] }),
    (0, class_validator_1.IsArray)(),
    (0, class_validator_1.IsString)({ each: true }),
    __metadata("design:type", Array)
], CategoryParametersDto.prototype, "en", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({ example: ["سائز", "رنگ"] }),
    (0, class_validator_1.IsArray)(),
    (0, class_validator_1.IsString)({ each: true }),
    __metadata("design:type", Array)
], CategoryParametersDto.prototype, "ur", void 0);
class CreateUpdateCategoryDto {
    name;
    description;
    parameters;
    icon;
    type;
    sortNumber;
    isDisabled;
}
exports.CreateUpdateCategoryDto = CreateUpdateCategoryDto;
__decorate([
    (0, swagger_1.ApiProperty)({
        example: {
            en: "Cleaning",
            ur: "صفائی",
        },
    }),
    (0, class_validator_1.IsObject)(),
    __metadata("design:type", Object)
], CreateUpdateCategoryDto.prototype, "name", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)({
        example: {
            en: "Home cleaning and sanitization services",
            ur: "گھر کی صفائی اور جراثیم کش خدمات",
        },
    }),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsObject)(),
    __metadata("design:type", Object)
], CreateUpdateCategoryDto.prototype, "description", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)({
        example: {
            en: ["Size", "Color"],
            ur: ["سائز", "رنگ"],
        },
        type: CategoryParametersDto,
    }),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.ValidateNested)(),
    (0, class_transformer_1.Type)(() => CategoryParametersDto),
    __metadata("design:type", CategoryParametersDto)
], CreateUpdateCategoryDto.prototype, "parameters", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)({ type: "string", format: "binary" }),
    (0, class_validator_1.IsOptional)(),
    __metadata("design:type", Object)
], CreateUpdateCategoryDto.prototype, "icon", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({
        enum: category_schema_1.CategoryType,
        example: category_schema_1.CategoryType.SERVICE,
    }),
    (0, class_validator_1.IsEnum)(category_schema_1.CategoryType),
    __metadata("design:type", String)
], CreateUpdateCategoryDto.prototype, "type", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)({
        example: 1,
        description: "Used to control display ordering of categories",
    }),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsNumber)(),
    __metadata("design:type", Number)
], CreateUpdateCategoryDto.prototype, "sortNumber", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)({
        example: false,
    }),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsBoolean)(),
    __metadata("design:type", Boolean)
], CreateUpdateCategoryDto.prototype, "isDisabled", void 0);
//# sourceMappingURL=category-create-update.dto.js.map