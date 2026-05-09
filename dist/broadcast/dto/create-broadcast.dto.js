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
exports.CreateBroadcastDto = void 0;
const swagger_1 = require("@nestjs/swagger");
const class_validator_1 = require("class-validator");
class CreateBroadcastDto {
    message;
    radius;
    categoryId;
    type;
    files;
}
exports.CreateBroadcastDto = CreateBroadcastDto;
__decorate([
    (0, swagger_1.ApiProperty)({ example: "Need 50kg rice urgently" }),
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.IsNotEmpty)(),
    __metadata("design:type", String)
], CreateBroadcastDto.prototype, "message", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({ example: 10 }),
    (0, class_validator_1.IsNumber)(),
    __metadata("design:type", Number)
], CreateBroadcastDto.prototype, "radius", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({ example: "66a1b2c3d4e5f67890123456" }),
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.IsNotEmpty)(),
    __metadata("design:type", String)
], CreateBroadcastDto.prototype, "categoryId", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({ example: "product", enum: ["product", "service"] }),
    (0, class_validator_1.IsEnum)(["product", "service"]),
    (0, class_validator_1.IsNotEmpty)(),
    __metadata("design:type", String)
], CreateBroadcastDto.prototype, "type", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)({
        type: "array",
        items: {
            type: "string",
            format: "binary",
        },
    }),
    __metadata("design:type", Array)
], CreateBroadcastDto.prototype, "files", void 0);
//# sourceMappingURL=create-broadcast.dto.js.map