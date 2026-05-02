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
exports.UserResponseDto = void 0;
const class_transformer_1 = require("class-transformer");
const swagger_1 = require("@nestjs/swagger");
let UserResponseDto = class UserResponseDto {
    id;
    name;
    email;
    role;
    location;
    createdAt;
    updatedAt;
};
exports.UserResponseDto = UserResponseDto;
__decorate([
    (0, swagger_1.ApiProperty)({ example: "507f1f77bcf86cd799439011" }),
    (0, class_transformer_1.Expose)(),
    __metadata("design:type", String)
], UserResponseDto.prototype, "id", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({ example: "John Doe" }),
    (0, class_transformer_1.Expose)(),
    __metadata("design:type", String)
], UserResponseDto.prototype, "name", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({ example: "user@example.com" }),
    (0, class_transformer_1.Expose)(),
    __metadata("design:type", String)
], UserResponseDto.prototype, "email", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({
        example: ["buyer"],
        isArray: true,
        enum: ["buyer", "seller", "admin", "subadmin"],
    }),
    (0, class_transformer_1.Expose)(),
    __metadata("design:type", Array)
], UserResponseDto.prototype, "role", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({
        example: { type: "Point", coordinates: [73.0479, 33.6844] },
    }),
    (0, class_transformer_1.Expose)(),
    __metadata("design:type", Object)
], UserResponseDto.prototype, "location", void 0);
__decorate([
    (0, swagger_1.ApiProperty)(),
    (0, class_transformer_1.Expose)(),
    __metadata("design:type", Date)
], UserResponseDto.prototype, "createdAt", void 0);
__decorate([
    (0, swagger_1.ApiProperty)(),
    (0, class_transformer_1.Expose)(),
    __metadata("design:type", Date)
], UserResponseDto.prototype, "updatedAt", void 0);
exports.UserResponseDto = UserResponseDto = __decorate([
    (0, class_transformer_1.Exclude)()
], UserResponseDto);
//# sourceMappingURL=user-response.dto.js.map