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
var __param = (this && this.__param) || function (paramIndex, decorator) {
    return function (target, key) { decorator(target, key, paramIndex); }
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.LikeController = void 0;
const common_1 = require("@nestjs/common");
const like_service_1 = require("./like.service");
const like_dto_1 = require("./dto/like.dto");
const swagger_1 = require("@nestjs/swagger");
const jwt_auth_guard_1 = require("../auth/guard/jwt-auth-guard");
const current_user_decorator_1 = require("../common/decorators/current-user.decorator");
let LikeController = class LikeController {
    likeService;
    constructor(likeService) {
        this.likeService = likeService;
    }
    async addLike(userId, dto) {
        return this.likeService.addLike(userId, dto);
    }
    async removeLike(userId, dto) {
        return this.likeService.removeLike(userId, dto);
    }
    async getLikesByUser(userId, itemType) {
        return this.likeService.getLikesByUser(userId, itemType);
    }
};
exports.LikeController = LikeController;
__decorate([
    (0, common_1.Post)(),
    (0, swagger_1.ApiOperation)({ summary: 'Like a product or service' }),
    (0, swagger_1.ApiResponse)({ status: 201, description: 'Item liked' }),
    __param(0, (0, current_user_decorator_1.CurrentUser)('sub')),
    __param(1, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, like_dto_1.CreateLikeDto]),
    __metadata("design:returntype", Promise)
], LikeController.prototype, "addLike", null);
__decorate([
    (0, common_1.Delete)(),
    (0, swagger_1.ApiOperation)({ summary: 'Unlike a product or service' }),
    (0, swagger_1.ApiResponse)({ status: 200, description: 'Item unliked' }),
    __param(0, (0, current_user_decorator_1.CurrentUser)('sub')),
    __param(1, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, like_dto_1.RemoveLikeDto]),
    __metadata("design:returntype", Promise)
], LikeController.prototype, "removeLike", null);
__decorate([
    (0, common_1.Get)('user/:userId'),
    (0, swagger_1.ApiOperation)({ summary: 'Get liked items by user' }),
    (0, swagger_1.ApiQuery)({ name: 'itemType', required: false, enum: ['product', 'service'] }),
    __param(0, (0, common_1.Param)('userId')),
    __param(1, (0, common_1.Query)('itemType')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String]),
    __metadata("design:returntype", Promise)
], LikeController.prototype, "getLikesByUser", null);
exports.LikeController = LikeController = __decorate([
    (0, swagger_1.ApiTags)('Likes'),
    (0, swagger_1.ApiBearerAuth)("jwt"),
    (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard),
    (0, common_1.Controller)('likes'),
    __metadata("design:paramtypes", [like_service_1.LikeService])
], LikeController);
//# sourceMappingURL=like.controller.js.map