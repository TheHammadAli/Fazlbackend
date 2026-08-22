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
exports.CreateUpdateShopDto = void 0;
const class_validator_1 = require("class-validator");
const class_transformer_1 = require("class-transformer");
const swagger_1 = require("@nestjs/swagger");
class LocationDto {
    type;
    coordinates;
}
__decorate([
    (0, swagger_1.ApiProperty)({ enum: ["Point"], example: "Point" }),
    (0, class_validator_1.IsEnum)(["Point"], { message: 'Location type must be "Point"' }),
    __metadata("design:type", String)
], LocationDto.prototype, "type", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({
        example: [73.0479, 33.6844],
        description: "Coordinates in [longitude, latitude] format",
    }),
    (0, class_validator_1.IsArray)(),
    (0, class_validator_1.ArrayMinSize)(2),
    (0, class_validator_1.ArrayMaxSize)(2),
    (0, class_validator_1.IsNumber)({}, { each: true }),
    __metadata("design:type", Array)
], LocationDto.prototype, "coordinates", void 0);
class CreateUpdateShopDto {
    title;
    address;
    description;
    category;
    subcategory;
    marketName;
    area;
    city;
    contact;
    openingHours;
    image;
    banner;
    location;
}
exports.CreateUpdateShopDto = CreateUpdateShopDto;
__decorate([
    (0, swagger_1.ApiProperty)({ example: "Smart Tech Store" }),
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.IsNotEmpty)(),
    __metadata("design:type", String)
], CreateUpdateShopDto.prototype, "title", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({ example: "Shop #12, Ground Floor, Singapore Plaza" }),
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.IsNotEmpty)(),
    __metadata("design:type", String)
], CreateUpdateShopDto.prototype, "address", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({ example: "Selling the latest smart gadgets and accessories." }),
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.IsNotEmpty)(),
    __metadata("design:type", String)
], CreateUpdateShopDto.prototype, "description", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({
        example: "685c611cbcf37e8c78f97f84",
        description: "Category ID (ObjectId)",
    }),
    (0, class_validator_1.IsMongoId)(),
    (0, class_validator_1.IsNotEmpty)(),
    __metadata("design:type", String)
], CreateUpdateShopDto.prototype, "category", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)({
        example: "685c611cbcf37e8c78f97f85",
        description: "Subcategory ID (ObjectId) - optional",
    }),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsMongoId)(),
    __metadata("design:type", String)
], CreateUpdateShopDto.prototype, "subcategory", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)({ example: "Singapore Plaza" }),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsString)(),
    __metadata("design:type", String)
], CreateUpdateShopDto.prototype, "marketName", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({ example: "Saddar" }),
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.IsNotEmpty)(),
    __metadata("design:type", String)
], CreateUpdateShopDto.prototype, "area", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({ example: "Karachi" }),
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.IsNotEmpty)(),
    __metadata("design:type", String)
], CreateUpdateShopDto.prototype, "city", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({ example: "+923001234567" }),
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.IsNotEmpty)(),
    __metadata("design:type", String)
], CreateUpdateShopDto.prototype, "contact", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)({
        example: "Mon-Sat 10:00 AM - 9:00 PM, Sunday Closed",
    }),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsString)(),
    __metadata("design:type", String)
], CreateUpdateShopDto.prototype, "openingHours", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)({
        type: "string",
        format: "binary",
        description: "Upload shop logo image",
    }),
    (0, class_validator_1.IsOptional)(),
    __metadata("design:type", Object)
], CreateUpdateShopDto.prototype, "image", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)({
        type: "string",
        format: "binary",
        description: "Upload shop banner image",
    }),
    (0, class_validator_1.IsOptional)(),
    __metadata("design:type", Object)
], CreateUpdateShopDto.prototype, "banner", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({ type: LocationDto }),
    (0, class_validator_1.ValidateNested)(),
    (0, class_transformer_1.Type)(() => LocationDto),
    __metadata("design:type", LocationDto)
], CreateUpdateShopDto.prototype, "location", void 0);
//# sourceMappingURL=create-update-shop.dto.js.map