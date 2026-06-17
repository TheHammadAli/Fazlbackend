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
exports.ProductsService = void 0;
const common_1 = require("@nestjs/common");
const mongoose_1 = require("@nestjs/mongoose");
const mongoose_2 = require("mongoose");
const nestjs_i18n_1 = require("nestjs-i18n");
const product_schema_1 = require("./schema/product.schema");
const shop_service_1 = require("../shop/shop.service");
const listing_util_service_1 = require("../shared/listing-util-service");
const users_service_1 = require("../users/users.service");
const file_upload_service_1 = require("../common/file-upload/file-upload.service");
const promotion_service_1 = require("../promotion/promotion.service");
const nestjs_cls_1 = require("nestjs-cls");
const like_service_1 = require("../like/like.service");
const reviews_service_1 = require("../reviews/reviews.service");
let ProductsService = class ProductsService {
    productModel;
    shopService;
    listingUtils;
    userService;
    fileUploadService;
    promotionService;
    i18n;
    cls;
    likeService;
    reviewService;
    constructor(productModel, shopService, listingUtils, userService, fileUploadService, promotionService, i18n, cls, likeService, reviewService) {
        this.productModel = productModel;
        this.shopService = shopService;
        this.listingUtils = listingUtils;
        this.userService = userService;
        this.fileUploadService = fileUploadService;
        this.promotionService = promotionService;
        this.i18n = i18n;
        this.cls = cls;
        this.likeService = likeService;
        this.reviewService = reviewService;
    }
    get lang() {
        return this.cls.get("lang") || "en";
    }
    async create(entityId, type, dto) {
        try {
            let location;
            const productPayload = {
                ...dto,
                category: new mongoose_2.Types.ObjectId(dto.category),
            };
            if (type === "shop") {
                const shop = await this.shopService.getShopById(entityId);
                if (!shop) {
                    throw new common_1.NotFoundException(this.i18n.translate("auth.products.shop_not_found", {
                        lang: this.lang,
                    }));
                }
                if (!shop.location ||
                    !shop.location.coordinates ||
                    shop.location.coordinates.length !== 2) {
                    throw new common_1.BadRequestException(this.i18n.translate("auth.products.shop_location_missing", {
                        lang: this.lang,
                    }));
                }
                productPayload.shopId = shop._id;
                location = shop.location;
                console.log("product payload", productPayload);
            }
            else if (type === "personal") {
                const user = await this.userService.findUserById(entityId);
                if (!user) {
                    throw new common_1.NotFoundException(this.i18n.translate("auth.products.user_not_found", {
                        lang: this.lang,
                    }));
                }
                console.log("User:", user);
                productPayload.ownerId = user._id;
                if (!user.location ||
                    !user.location.coordinates ||
                    user.location.coordinates.length !== 2) {
                    throw new common_1.BadRequestException(this.i18n.translate("auth.products.user_location_missing", {
                        lang: this.lang,
                    }));
                }
                location = {
                    type: "Point",
                    coordinates: user.location.coordinates,
                };
            }
            else {
                throw new common_1.BadRequestException('Invalid type. Must be "shop" or "personal".');
            }
            console.log("Product Payload:", productPayload);
            const createdProduct = new this.productModel({
                ...productPayload,
                location,
                images: [],
                video: "",
                category: new mongoose_2.Types.ObjectId(dto.category),
            });
            let imageUrls = [];
            if (dto?.images?.length) {
                const uploadedFiles = await this.fileUploadService.uploadProductFiles(dto.images, type, entityId, createdProduct._id.toString(), "images");
                imageUrls = uploadedFiles.map((file) => file.url);
                createdProduct.images = imageUrls;
            }
            console.log(dto?.video, "Video Length", dto?.video);
            if (dto?.video) {
                const uploadedVideo = await this.fileUploadService.uploadProductFiles([dto.video], type, entityId, createdProduct._id.toString(), "video");
                console.log("Uploaded Video:", uploadedVideo);
                createdProduct.video = uploadedVideo[0].url;
            }
            if (createdProduct.parameters && createdProduct.parameters.length > 0) {
                createdProduct.searchableTags = [
                    ...createdProduct.parameters.flatMap(p => [p.name, ...p.variants])
                ];
            }
            else {
                createdProduct.searchableTags = [];
            }
            const result = await createdProduct.save();
            return {
                message: this.i18n.translate("auth.products.created_success", {
                    lang: this.lang,
                }),
                data: {
                    product: result,
                },
            };
        }
        catch (err) {
            throw new common_1.InternalServerErrorException(err);
        }
    }
    async getAllProductsByShop(shopId, paginationDto) {
        const { page = 1, limit = 10 } = paginationDto;
        const skip = (page - 1) * limit;
        const [items, total] = await Promise.all([
            this.productModel
                .find({ shopId: new mongoose_2.Types.ObjectId(shopId), isDeleted: false, isDisabled: false })
                .populate("category")
                .populate("shopId")
                .sort({ createdAt: -1 })
                .skip(skip)
                .limit(limit),
            this.productModel.countDocuments({ shopId: new mongoose_2.Types.ObjectId(shopId), isDeleted: false, isDisabled: false }),
        ]);
        return {
            meta: { total, page, limit, totalPages: Math.ceil(total / limit) },
            data: items,
        };
    }
    async getAllProductsByUser(ownerId, paginationDto) {
        const { page = 1, limit = 10 } = paginationDto;
        const skip = (page - 1) * limit;
        console.log("Fetching products for user:", ownerId);
        const [items, total] = await Promise.all([
            this.productModel
                .find({ ownerId: new mongoose_2.Types.ObjectId(ownerId), isDeleted: false, isDisabled: false })
                .populate("category")
                .populate("ownerId")
                .sort({ createdAt: -1 })
                .skip(skip)
                .limit(limit),
            this.productModel.countDocuments({ ownerId, isDeleted: false, isDisabled: false }),
        ]);
        return {
            meta: { total, page, limit, totalPages: Math.ceil(total / limit) },
            data: items,
        };
    }
    async getById(id, userId) {
        const product = await this.productModel
            .findOne({
            _id: new mongoose_2.Types.ObjectId(id),
            isDeleted: false,
            isDisabled: false,
        })
            .populate("category")
            .populate({
            path: "shopId",
            populate: {
                path: "ownerId",
                select: "_id name phone"
            },
        })
            .populate({
            path: "ownerId",
        }).lean();
        if (!product)
            throw new common_1.NotFoundException(this.i18n.translate("auth.products.product_not_found", {
                lang: this.lang,
            }));
        console.log("userId", userId);
        if (!userId)
            return product;
        const [isLiked, userReview] = await Promise.all([
            this.likeService.isLiked(userId, id, "product"),
            this.reviewService.findOne(userId, id, "product"),
        ]);
        const plain = product.toObject ? product.toObject() : product;
        console.log("Product Details:", plain);
        console.log("Is Liked by User:", isLiked);
        console.log("User's Review:", userReview);
        return {
            ...plain,
            isLiked: !!isLiked,
            isReviewed: userReview || null,
        };
    }
    async update(productId, updateDto) {
        if ("shopId" in updateDto) {
            throw new common_1.ForbiddenException(this.i18n.translate("auth.products.shop_cant_update", {
                lang: this.lang,
            }));
        }
        if (updateDto.category) {
            updateDto.category = new mongoose_2.Types.ObjectId(updateDto.category);
        }
        Object.keys(updateDto).forEach((key) => {
            if (updateDto[key] === "" ||
                updateDto[key] === null ||
                typeof updateDto[key] === "undefined") {
                delete updateDto[key];
            }
        });
        const existingProduct = await this.productModel.findOne({ _id: new mongoose_2.Types.ObjectId(productId), isDeleted: false, isDisabled: false });
        if (!existingProduct) {
            throw new common_1.NotFoundException(this.i18n.translate("auth.products.product_not_found", {
                lang: this.lang,
            }));
        }
        if (updateDto.images && updateDto.images.length > 0) {
            const uploadedFiles = await this.fileUploadService.uploadProductFiles(updateDto.images, "shop", existingProduct.shopId ? existingProduct.shopId.toString() : existingProduct.ownerId.toString(), productId, "images");
            console.log("Uploaded Images:", uploadedFiles);
            const newImages = uploadedFiles.map((file) => file.url);
            updateDto.images = [...(existingProduct.images || []), ...newImages];
        }
        if (updateDto.video) {
            const uploadedVideo = await this.fileUploadService.uploadProductFiles([updateDto.video], "shop", existingProduct.shopId ? existingProduct.shopId.toString() : existingProduct.ownerId.toString(), productId, "video");
            console.log("Uploaded Video:", uploadedVideo);
            updateDto.video = uploadedVideo[0].url;
        }
        const updated = await this.productModel
            .findOneAndUpdate({ _id: new mongoose_2.Types.ObjectId(productId), isDeleted: false, isDisabled: false }, updateDto, { new: true })
            .exec();
        if (!updated) {
            throw new common_1.NotFoundException(this.i18n.translate("auth.products.product_not_found", {
                lang: this.lang,
            }));
        }
        return {
            message: this.i18n.translate("auth.products.updated_success", {
                lang: this.lang,
            }),
            data: {
                product: updated,
            },
        };
    }
    async delete(productId, lang = "en") {
        const existingProduct = await this.productModel.findOne({ _id: new mongoose_2.Types.ObjectId(productId), isDeleted: false, isDisabled: false });
        if (!existingProduct) {
            throw new common_1.NotFoundException(this.i18n.translate("auth.products.product_not_found", {
                lang: this.lang,
            }));
        }
        const type = existingProduct.shopId ? "shop" : "personal";
        const entityId = existingProduct.shopId
            ? existingProduct.shopId.toString()
            : existingProduct.ownerId.toString();
        await this.fileUploadService.deleteEntityProducts(type, entityId, productId);
        const result = await this.productModel.findByIdAndUpdate(new mongoose_2.Types.ObjectId(productId), { isDeleted: true, images: [], video: "" });
        if (!result)
            throw new common_1.NotFoundException(this.i18n.translate("auth.products.product_not_found", {
                lang: this.lang,
            }));
    }
    async deleteProductMedia(productId, media) {
        const existingProduct = await this.productModel.findOne({ _id: new mongoose_2.Types.ObjectId(productId), isDeleted: false, isDisabled: false });
        if (!existingProduct) {
            throw new common_1.NotFoundException(this.i18n.translate("auth.products.product_not_found", {
                lang: this.lang,
            }));
        }
        if (!media || media.length === 0) {
            throw new common_1.BadRequestException(this.i18n.translate("auth.products.no_media_provided", {
                lang: this.lang,
            }));
        }
        await this.fileUploadService.deleteFiles(media);
        let images = existingProduct.images || [];
        let video = existingProduct.video;
        images = images.filter((imgUrl) => !media.includes(imgUrl));
        if (media.includes(video)) {
            video = "";
        }
        existingProduct.images = images;
        existingProduct.video = video;
        await existingProduct.save();
        return true;
    }
    async searchNearbyWithCategory(category, coordinates, radius, pagination) {
        return this.listingUtils.findNearbyWithCategory(this.productModel, category, coordinates, radius, pagination);
    }
    async findNearbyProductShopOwnerIds(categoryId, coordinates, radiusInMeters) {
        const results = await this.productModel.aggregate([
            {
                $geoNear: {
                    near: { type: "Point", coordinates },
                    distanceField: "distance",
                    maxDistance: radiusInMeters,
                    query: {
                        category: new mongoose_2.Types.ObjectId(categoryId),
                        isDeleted: false,
                        isDisabled: false,
                    },
                    spherical: true,
                },
            },
            {
                $lookup: {
                    from: "shops",
                    localField: "shopId",
                    foreignField: "_id",
                    as: "shop",
                },
            },
            {
                $unwind: {
                    path: "$shop",
                    preserveNullAndEmptyArrays: true,
                },
            },
            {
                $project: {
                    ownerId: {
                        $ifNull: ["$shop.ownerId", "$ownerId"],
                    },
                },
            },
            {
                $match: {
                    ownerId: { $exists: true, $ne: null },
                },
            },
            {
                $group: {
                    _id: "$ownerId",
                },
            },
        ]);
        return results
            .map((result) => result._id?.toString())
            .filter(Boolean);
    }
    async updateLocationByShopId(shopId, location) {
        await this.productModel.updateMany({ shopId }, { $set: { location } });
    }
    async setDisabledByShop(shopId, disabled) {
        await this.productModel.updateMany({ shopId: new mongoose_2.Types.ObjectId(shopId) }, { $set: { isDisabled: disabled } });
    }
    async setProductsDisabledByShopsBulk(shopIds, disabled) {
        await this.productModel.updateMany({ shopId: { $in: shopIds } }, { $set: { isDisabled: disabled } });
    }
    async setProductsDisabledByUser(userId, disabled) {
        await this.productModel.updateMany({ ownerId: new mongoose_2.Types.ObjectId(userId) }, { $set: { isDisabled: disabled } });
    }
    async searchProducts(query) {
        const page = Math.max(1, query.page || 1);
        const limit = Math.max(1, query.limit || 10);
        const skip = (page - 1) * limit;
        const allPromotedIds = await this.promotionService.getActivePromotionProductIds();
        const baseFilter = {
            isDeleted: false,
            isDisabled: false,
        };
        if (query.category) {
            baseFilter.category = new mongoose_2.Types.ObjectId(query.category);
        }
        const searchTerm = query.name?.trim();
        const promotedProducts = await this.productModel
            .find({
            _id: { $in: allPromotedIds },
            ...baseFilter,
        })
            .sort({ createdAt: -1 })
            .lean()
            .exec();
        const promotedProductIds = promotedProducts.map((p) => new mongoose_2.Types.ObjectId(p._id).toString());
        let regularFilter = {
            ...baseFilter,
            _id: { $nin: promotedProductIds.map((id) => new mongoose_2.Types.ObjectId(id)) },
        };
        if (searchTerm) {
            regularFilter.$or = [
                { title: { $regex: searchTerm, $options: 'i' } },
                { description: { $regex: searchTerm, $options: 'i' } },
                { 'parameters.name': { $regex: searchTerm, $options: 'i' } },
                { 'parameters.variants': { $regex: searchTerm, $options: 'i' } },
            ];
        }
        const [regularProducts, total] = await Promise.all([
            this.productModel
                .find(regularFilter)
                .sort({ createdAt: -1 })
                .skip(skip)
                .limit(limit)
                .lean()
                .exec(),
            this.productModel.countDocuments(regularFilter),
        ]);
        const [enrichedPromotions, enrichedRegularProducts] = await Promise.all([
            this.enrichProductsWithReviewStats(promotedProducts),
            this.enrichProductsWithReviewStats(regularProducts),
        ]);
        return {
            data: {
                promotions: enrichedPromotions,
                items: enrichedRegularProducts,
            },
            meta: {
                total,
                page,
                limit,
                totalPages: Math.ceil(total / limit),
            },
        };
    }
    async enrichProductsWithReviewStats(products) {
        if (!products || products.length === 0) {
            return products;
        }
        const productIds = products.map((product) => new mongoose_2.Types.ObjectId(product._id));
        const reviewStats = await this.reviewService.getAverageRatingsForItems(productIds, "product");
        const reviewMap = new Map(reviewStats.map((item) => [
            item._id.toString(),
            {
                avgRating: item.avgRating ?? 0,
                reviewCount: item.count ?? 0,
            },
        ]));
        return products.map((product) => {
            const stats = reviewMap.get(new mongoose_2.Types.ObjectId(product._id).toString());
            return {
                ...product,
                averageRating: stats?.avgRating
                    ? Number(stats.avgRating.toFixed(1))
                    : 0,
                reviewCount: stats?.reviewCount ?? 0,
            };
        });
    }
    async getProductsWithVideos(paginationDto, userId, category) {
        const { page = 1, limit = 10 } = paginationDto;
        const skip = (page - 1) * limit;
        const filter = {
            video: { $exists: true, $nin: ["", null] },
            isDeleted: false,
            isDisabled: false,
        };
        if (category) {
            filter.category = new mongoose_2.Types.ObjectId(category);
        }
        const [items, total] = await Promise.all([
            this.productModel
                .find(filter)
                .populate("category")
                .sort({ createdAt: -1 })
                .skip(skip)
                .limit(limit)
                .lean()
                .exec(),
            this.productModel.countDocuments(filter).exec(),
        ]);
        if (!userId) {
            return {
                meta: { total, page, limit, totalPages: Math.ceil(total / limit) },
                data: items,
            };
        }
        const user = await this.userService.findUserById(userId);
        if (!user) {
            throw new common_1.NotFoundException(this.i18n.translate("auth.users.user_not_found", {
                lang: this.lang,
            }));
        }
        const productIds = items.map((item) => new mongoose_2.Types.ObjectId(item._id));
        const likes = await this.likeService.getLikesByUser(userId, "product", productIds);
        console.log("Products with Likes:", likes);
        const likedProductIds = new Set(likes.map((like) => like.itemId.toString()));
        console.log("Liked Product IDs:", likedProductIds);
        const data = items.map((item) => ({
            ...item,
            isLiked: likedProductIds.has(item._id.toString()),
        }));
        return {
            meta: {
                total,
                page,
                limit,
                totalPages: Math.ceil(total / limit),
            },
            data,
        };
    }
};
exports.ProductsService = ProductsService;
exports.ProductsService = ProductsService = __decorate([
    (0, common_1.Injectable)(),
    __param(0, (0, mongoose_1.InjectModel)(product_schema_1.Product.name)),
    __param(1, (0, common_1.Inject)((0, common_1.forwardRef)(() => shop_service_1.ShopService))),
    __param(3, (0, common_1.Inject)((0, common_1.forwardRef)(() => users_service_1.UsersService))),
    __param(8, (0, common_1.Inject)((0, common_1.forwardRef)(() => like_service_1.LikeService))),
    __metadata("design:paramtypes", [mongoose_2.Model,
        shop_service_1.ShopService,
        listing_util_service_1.ListingUtilsService,
        users_service_1.UsersService,
        file_upload_service_1.FileUploadService,
        promotion_service_1.PromotionService,
        nestjs_i18n_1.I18nService,
        nestjs_cls_1.ClsService,
        like_service_1.LikeService,
        reviews_service_1.ReviewService])
], ProductsService);
//# sourceMappingURL=products.service.js.map