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
exports.CreateServiceDto = void 0;
const class_validator_1 = require("class-validator");
const swagger_1 = require("@nestjs/swagger");
class CreateServiceDto {
    title;
    description;
    price;
    paymentType;
    requiresAppointment;
    images;
    video;
    category;
}
exports.CreateServiceDto = CreateServiceDto;
__decorate([
    (0, swagger_1.ApiProperty)({
        example: "Home Cleaning",
        description: "Title of the service",
    }),
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.IsNotEmpty)(),
    __metadata("design:type", String)
], CreateServiceDto.prototype, "title", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)({ example: "We offer deep cleaning for all rooms." }),
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.IsOptional)(),
    __metadata("design:type", String)
], CreateServiceDto.prototype, "description", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({ example: 1500, description: "Price of the service in PKR" }),
    (0, class_validator_1.IsNumber)(),
    __metadata("design:type", Number)
], CreateServiceDto.prototype, "price", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({ enum: ["hourly", "fixed"], example: "hourly" }),
    (0, class_validator_1.IsEnum)(["hourly", "fixed"]),
    __metadata("design:type", String)
], CreateServiceDto.prototype, "paymentType", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)({ example: true }),
    (0, class_validator_1.IsOptional)(),
    __metadata("design:type", Boolean)
], CreateServiceDto.prototype, "requiresAppointment", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({
        type: "string",
        format: "binary",
        isArray: true,
        description: "Upload multiple images",
    }),
    __metadata("design:type", Object)
], CreateServiceDto.prototype, "images", void 0);
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
], CreateServiceDto.prototype, "video", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({ example: "cleaning", description: "Category ID or slug" }),
    (0, class_validator_1.IsString)(),
    __metadata("design:type", String)
], CreateServiceDto.prototype, "category", void 0);
//# sourceMappingURL=create-service.dto.js.map