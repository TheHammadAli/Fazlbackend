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
exports.RespondBroadcastDto = void 0;
const swagger_1 = require("@nestjs/swagger");
const class_validator_1 = require("class-validator");
class RespondBroadcastDto {
    broadcastId;
    sellerId;
    message;
}
exports.RespondBroadcastDto = RespondBroadcastDto;
__decorate([
    (0, swagger_1.ApiProperty)({ example: '66b1a2c3d4e5f67890123456' }),
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.IsNotEmpty)(),
    __metadata("design:type", String)
], RespondBroadcastDto.prototype, "broadcastId", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({ example: '66c1a2c3d4e5f67890123456 (sellerId)' }),
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.IsNotEmpty)(),
    __metadata("design:type", String)
], RespondBroadcastDto.prototype, "sellerId", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({ example: 'I can supply at best price within 2 hours' }),
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.IsNotEmpty)(),
    __metadata("design:type", String)
], RespondBroadcastDto.prototype, "message", void 0);
//# sourceMappingURL=respond-broadcast.dto.js.map