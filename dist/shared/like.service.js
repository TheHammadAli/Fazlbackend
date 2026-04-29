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
exports.LikeService = void 0;
const common_1 = require("@nestjs/common");
const mongoose_1 = require("@nestjs/mongoose");
const mongoose_2 = require("mongoose");
const like_schema_1 = require("./schema/like.schema");
const products_service_1 = require("../products/products.service");
const services_service_1 = require("../services/services.service");
const nestjs_i18n_1 = require("nestjs-i18n");
const nestjs_cls_1 = require("nestjs-cls");
let LikeService = class LikeService {
    likeModel;
    productsService;
    servicesService;
    i18n;
    cls;
    constructor(likeModel, productsService, servicesService, i18n, cls) {
        this.likeModel = likeModel;
        this.productsService = productsService;
        this.servicesService = servicesService;
        this.i18n = i18n;
        this.cls = cls;
    }
    get lang() {
        return this.cls.get('lang') || 'en';
    }
    async addLike(userId, dto) {
        const userObjectId = new mongoose_2.Types.ObjectId(userId);
        const itemObjectId = new mongoose_2.Types.ObjectId(dto.itemId);
        await this.validateItemExists(dto.itemId, dto.itemType);
        const existingLike = await this.likeModel.findOne({
            userId: userObjectId,
            itemId: itemObjectId,
            itemType: dto.itemType,
        });
        if (existingLike) {
            throw new common_1.ConflictException(this.i18n.translate('auth.like.already_liked', { lang: this.lang }));
        }
        const like = new this.likeModel({
            userId: userObjectId,
            itemId: itemObjectId,
            itemType: dto.itemType,
            ownerModel: dto.ownerModel,
        });
        return like.save();
    }
    async removeLike(userId, dto) {
        const result = await this.likeModel.findOneAndDelete({
            userId: new mongoose_2.Types.ObjectId(userId),
            itemId: new mongoose_2.Types.ObjectId(dto.itemId),
            itemType: dto.itemType,
        });
        if (!result) {
            throw new common_1.NotFoundException(this.i18n.translate('auth.like.not_found', { lang: this.lang }));
        }
        return {
            message: this.i18n.translate('auth.like.removed', { lang: this.lang }),
        };
    }
    async getLikesByUser(userId, itemType) {
        const userObjectId = new mongoose_2.Types.ObjectId(userId);
        const query = { userId: userObjectId };
        if (itemType)
            query.itemType = itemType;
        const likes = await this.likeModel
            .find(query)
            .sort({ createdAt: -1 })
            .lean();
        const populatedLikes = await Promise.all(likes.map(async (like) => {
            if (!like.itemId)
                return null;
            let itemDetails = null;
            try {
                if (like.itemType === 'product') {
                    itemDetails = await this.productsService.getById(like.itemId.toString(), this.lang);
                }
                else if (like.itemType === 'service') {
                    itemDetails = await this.servicesService.getById(like.itemId.toString());
                }
            }
            catch (error) {
            }
            if (!itemDetails)
                return null;
            return {
                ...like,
                itemDetails,
            };
        }));
        return populatedLikes.filter(Boolean);
    }
    async isLiked(userId, itemId, itemType) {
        const exists = await this.likeModel.exists({
            userId: new mongoose_2.Types.ObjectId(userId),
            itemId: new mongoose_2.Types.ObjectId(itemId),
            itemType,
        });
        return !!exists;
    }
    async getLikeCount(itemId, itemType) {
        return this.likeModel.countDocuments({
            itemId: new mongoose_2.Types.ObjectId(itemId),
            itemType,
        });
    }
    async validateItemExists(itemId, itemType) {
        if (itemType === 'product') {
            const product = await this.productsService.getById(itemId, this.lang);
            if (!product) {
                throw new common_1.NotFoundException(this.i18n.translate('auth.like.product_not_found', {
                    lang: this.lang,
                }));
            }
        }
        if (itemType === 'service') {
            const service = await this.servicesService.getById(itemId);
            if (!service) {
                throw new common_1.NotFoundException(this.i18n.translate('auth.like.service_not_found', {
                    lang: this.lang,
                }));
            }
        }
    }
};
exports.LikeService = LikeService;
exports.LikeService = LikeService = __decorate([
    (0, common_1.Injectable)(),
    __param(0, (0, mongoose_1.InjectModel)(like_schema_1.Like.name)),
    __metadata("design:paramtypes", [mongoose_2.Model,
        products_service_1.ProductsService,
        services_service_1.ServicesService,
        nestjs_i18n_1.I18nService,
        nestjs_cls_1.ClsService])
], LikeService);
//# sourceMappingURL=like.service.js.map