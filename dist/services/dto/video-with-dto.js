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
exports.GetWithVideosDto = void 0;
const swagger_1 = require("@nestjs/swagger");
class GetWithVideosDto {
    page;
    limit;
    category;
}
exports.GetWithVideosDto = GetWithVideosDto;
__decorate([
    (0, swagger_1.ApiPropertyOptional)({
        description: "Page number",
        default: 1,
    }),
    __metadata("design:type", Number)
], GetWithVideosDto.prototype, "page", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)({
        description: "Items per page",
        default: 10,
    }),
    __metadata("design:type", Number)
], GetWithVideosDto.prototype, "limit", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)({
        description: "Which category to filter by",
    }),
    __metadata("design:type", String)
], GetWithVideosDto.prototype, "category", void 0);
//# sourceMappingURL=video-with-dto.js.map