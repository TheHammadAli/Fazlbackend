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
exports.UpdateUserDto = void 0;
const class_validator_1 = require("class-validator");
const class_transformer_1 = require("class-transformer");
const swagger_1 = require("@nestjs/swagger");
class LocationDto {
    type;
    coordinates;
}
__decorate([
    (0, swagger_1.ApiProperty)({ enum: ['Point'], example: 'Point' }),
    (0, class_validator_1.IsEnum)(['Point'], { message: 'Location type must be "Point"' }),
    __metadata("design:type", String)
], LocationDto.prototype, "type", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({ example: [73.0479, 33.6844], description: '[lng, lat]' }),
    (0, class_validator_1.IsArray)(),
    (0, class_validator_1.ArrayMinSize)(2),
    (0, class_validator_1.ArrayMaxSize)(2),
    (0, class_validator_1.IsNumber)({}, { each: true }),
    __metadata("design:type", Array)
], LocationDto.prototype, "coordinates", void 0);
class UpdateUserDto {
    password;
    phone;
    address;
    roles;
    language;
    location;
    image;
    refreshToken;
    resetPasswordToken;
    resetPasswordExpires;
}
exports.UpdateUserDto = UpdateUserDto;
__decorate([
    (0, swagger_1.ApiPropertyOptional)({ example: 'secret123' }),
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.IsOptional)(),
    __metadata("design:type", String)
], UpdateUserDto.prototype, "password", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)({ example: '+923001234567' }),
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.IsOptional)(),
    __metadata("design:type", String)
], UpdateUserDto.prototype, "phone", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)({ example: 'Street 1, City' }),
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.IsOptional)(),
    __metadata("design:type", String)
], UpdateUserDto.prototype, "address", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)({
        example: ['buyer'],
        enum: ['buyer', 'seller', 'admin', 'subadmin'],
        isArray: true,
    }),
    (0, class_validator_1.IsArray)(),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsEnum)(['buyer', 'seller', 'admin', 'subadmin'], { each: true }),
    __metadata("design:type", Array)
], UpdateUserDto.prototype, "roles", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)({ enum: ['en', 'ur'], example: 'en' }),
    (0, class_validator_1.IsEnum)(['en', 'ur'], { message: 'Language must be either en or ur' }),
    (0, class_validator_1.IsOptional)(),
    __metadata("design:type", String)
], UpdateUserDto.prototype, "language", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)({ type: LocationDto }),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.ValidateNested)(),
    (0, class_transformer_1.Type)(() => LocationDto),
    __metadata("design:type", LocationDto)
], UpdateUserDto.prototype, "location", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)({
        type: 'string',
        format: 'binary',
        isArray: true,
        description: 'Upload image',
    }),
    __metadata("design:type", Object)
], UpdateUserDto.prototype, "image", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)({ example: 'refreshToken' }),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsString)(),
    __metadata("design:type", Object)
], UpdateUserDto.prototype, "refreshToken", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)({ example: 'resetPasswordToken' }),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsString)(),
    __metadata("design:type", Object)
], UpdateUserDto.prototype, "resetPasswordToken", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)({ example: 'resetPasswordExpires' }),
    (0, class_validator_1.IsOptional)(),
    __metadata("design:type", Object)
], UpdateUserDto.prototype, "resetPasswordExpires", void 0);
//# sourceMappingURL=update-user.dto.js.map