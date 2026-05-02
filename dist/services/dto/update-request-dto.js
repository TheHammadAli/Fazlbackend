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
exports.UpdateRequestStatusDto = void 0;
const class_validator_1 = require("class-validator");
const swagger_1 = require("@nestjs/swagger");
class UpdateRequestStatusDto {
    requestId;
    action;
    proposedDateTime;
}
exports.UpdateRequestStatusDto = UpdateRequestStatusDto;
__decorate([
    (0, swagger_1.ApiProperty)(),
    (0, class_validator_1.IsString)(),
    __metadata("design:type", String)
], UpdateRequestStatusDto.prototype, "requestId", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({ enum: ["accept", "reject", "cancel", "propose", "confirm"] }),
    (0, class_validator_1.IsEnum)(["accept", "reject", "cancel", "propose", "confirm"]),
    __metadata("design:type", String)
], UpdateRequestStatusDto.prototype, "action", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)({ example: "2025-07-01T18:00:00Z" }),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsDateString)(),
    __metadata("design:type", String)
], UpdateRequestStatusDto.prototype, "proposedDateTime", void 0);
//# sourceMappingURL=update-request-dto.js.map