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
exports.UpdateServiceDto = void 0;
const class_validator_1 = require("class-validator");
const swagger_1 = require("@nestjs/swagger");
const create_service_dto_1 = require("./create-service.dto");
const class_transformer_1 = require("class-transformer");
class UpdateServiceDto {
    title;
    description;
    price;
    paymentType;
    requiresAppointment;
    images;
    video;
    category;
    parameters;
}
exports.UpdateServiceDto = UpdateServiceDto;
__decorate([
    (0, swagger_1.ApiPropertyOptional)({ example: "Home Cleaning Deluxe" }),
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.IsOptional)(),
    __metadata("design:type", String)
], UpdateServiceDto.prototype, "title", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)({
        example: "Includes balcony, kitchen, and bathroom cleaning.",
    }),
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.IsOptional)(),
    __metadata("design:type", String)
], UpdateServiceDto.prototype, "description", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)({ example: 2000 }),
    (0, class_validator_1.IsNumber)(),
    (0, class_validator_1.IsOptional)(),
    __metadata("design:type", Number)
], UpdateServiceDto.prototype, "price", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)({ enum: ["hourly", "fixed", "call_for_price"], example: "fixed" }),
    (0, class_validator_1.IsEnum)(["hourly", "fixed", "call_for_price"]),
    (0, class_validator_1.IsOptional)(),
    __metadata("design:type", String)
], UpdateServiceDto.prototype, "paymentType", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)({ example: false }),
    (0, class_validator_1.IsOptional)(),
    __metadata("design:type", Boolean)
], UpdateServiceDto.prototype, "requiresAppointment", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({
        type: "string",
        format: "binary",
        isArray: true,
        description: "Upload multiple images",
    }),
    (0, swagger_1.ApiPropertyOptional)(),
    __metadata("design:type", Object)
], UpdateServiceDto.prototype, "images", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({
        type: "string",
        format: "binary",
        isArray: true,
        description: "Upload One video file",
        maximum: 1,
    }),
    (0, swagger_1.ApiPropertyOptional)(),
    __metadata("design:type", Object)
], UpdateServiceDto.prototype, "video", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)({ example: "cleaning" }),
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.IsOptional)(),
    __metadata("design:type", String)
], UpdateServiceDto.prototype, "category", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)({
        type: [create_service_dto_1.ServiceParameterDto],
        example: [
            { name: "Color", variants: ["Red", "Blue"] },
        ],
        description: "Custom service parameters like size, color, etc.",
    }),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsArray)(),
    (0, class_validator_1.ValidateNested)({ each: true }),
    (0, class_transformer_1.Type)(() => create_service_dto_1.ServiceParameterDto),
    __metadata("design:type", Array)
], UpdateServiceDto.prototype, "parameters", void 0);
//# sourceMappingURL=update-service.dto.js.map