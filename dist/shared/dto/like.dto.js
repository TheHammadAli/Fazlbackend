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
exports.RemoveLikeDto = exports.CreateLikeDto = void 0;
const swagger_1 = require("@nestjs/swagger");
const class_validator_1 = require("class-validator");
class CreateLikeDto {
    itemId;
    itemType;
    ownerModel;
}
exports.CreateLikeDto = CreateLikeDto;
__decorate([
    (0, swagger_1.ApiProperty)({
        example: "507f1f77bcf86cd799439011",
        description: "ID of the item to like",
    }),
    (0, class_validator_1.IsNotEmpty)(),
    (0, class_validator_1.IsMongoId)(),
    __metadata("design:type", String)
], CreateLikeDto.prototype, "itemId", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({
        enum: ["product", "service"],
        description: "Type of item being liked",
    }),
    (0, class_validator_1.IsNotEmpty)(),
    (0, class_validator_1.IsEnum)(["product", "service"]),
    __metadata("design:type", String)
], CreateLikeDto.prototype, "itemType", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({ enum: ["Shop", "User"], description: "Owner model type" }),
    (0, class_validator_1.IsNotEmpty)(),
    (0, class_validator_1.IsEnum)(["Shop", "User"]),
    __metadata("design:type", String)
], CreateLikeDto.prototype, "ownerModel", void 0);
class RemoveLikeDto {
    itemId;
    itemType;
}
exports.RemoveLikeDto = RemoveLikeDto;
__decorate([
    (0, swagger_1.ApiProperty)({
        example: "507f1f77bcf86cd799439011",
        description: "ID of the item to unlike",
    }),
    (0, class_validator_1.IsNotEmpty)(),
    (0, class_validator_1.IsMongoId)(),
    __metadata("design:type", String)
], RemoveLikeDto.prototype, "itemId", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({
        enum: ["product", "service"],
        description: "Type of item being unliked",
    }),
    (0, class_validator_1.IsNotEmpty)(),
    (0, class_validator_1.IsEnum)(["product", "service"]),
    __metadata("design:type", String)
], RemoveLikeDto.prototype, "itemType", void 0);
//# sourceMappingURL=like.dto.js.map