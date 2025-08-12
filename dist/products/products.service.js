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
const product_schema_1 = require("./schema/product.schema");
const shop_service_1 = require("../shop/shop.service");
const listing_util_service_1 = require("../shared/listing-util-service");
const users_service_1 = require("../users/users.service");
const file_upload_service_1 = require("../common/file-upload/file-upload.service");
let ProductsService = class ProductsService {
    productModel;
    shopService;
    listingUtils;
    userService;
    fileUploadService;
    constructor(productModel, shopService, listingUtils, userService, fileUploadService) {
        this.productModel = productModel;
        this.shopService = shopService;
        this.listingUtils = listingUtils;
        this.userService = userService;
        this.fileUploadService = fileUploadService;
    }
    async create(entityId, type, dto, files) {
        try {
            let location;
            const productPayload = {
                ...dto,
                category: new mongoose_2.Types.ObjectId(dto.category),
            };
            if (type === 'shop') {
                const shop = await this.shopService.getShopById(entityId);
                if (!shop) {
                    throw new common_1.NotFoundException('Shop not found');
                }
                if (!shop.location ||
                    !shop.location.coordinates ||
                    shop.location.coordinates.length !== 2) {
                    throw new common_1.BadRequestException('Shop location is missing');
                }
                productPayload.shopId = shop._id;
                location = shop.location;
            }
            else if (type === 'personal') {
                const user = await this.userService.findUserById(entityId);
                if (!user) {
                    throw new common_1.NotFoundException('User not found');
                }
                console.log('User:', user);
                productPayload.ownerId = user._id;
                if (!user.location ||
                    !user.location.coordinates ||
                    user.location.coordinates.length !== 2) {
                    throw new common_1.BadRequestException('User location is missing');
                }
                location = {
                    type: 'Point',
                    coordinates: user.location.coordinates,
                };
            }
            else {
                throw new common_1.BadRequestException('Invalid type. Must be "shop" or "personal".');
            }
            console.log('Product Payload:', productPayload);
            const createdProduct = new this.productModel({
                ...productPayload,
                location,
                category: new mongoose_2.Types.ObjectId(dto.category),
            });
            let imageUrls = [];
            if (files?.images?.length) {
                const uploadedFiles = await this.fileUploadService.uploadProductFiles(files.images, type, entityId, createdProduct._id.toString());
                imageUrls = uploadedFiles.map(file => file.url);
            }
            createdProduct.imageUrls = imageUrls;
            return await createdProduct.save();
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
                .find({ shopId })
                .populate('category')
                .sort({ createdAt: -1 })
                .skip(skip)
                .limit(limit),
            this.productModel.countDocuments({ shopId }),
        ]);
        return {
            meta: { total, page, limit, totalPages: Math.ceil(total / limit) },
            data: items,
        };
    }
    async getAllProductsByUser(ownerId, paginationDto) {
        const { page = 1, limit = 10 } = paginationDto;
        const skip = (page - 1) * limit;
        const [items, total] = await Promise.all([
            this.productModel
                .find({ ownerId })
                .populate('category')
                .sort({ createdAt: -1 })
                .skip(skip)
                .limit(limit),
            this.productModel.countDocuments({ ownerId }),
        ]);
        return {
            meta: { total, page, limit, totalPages: Math.ceil(total / limit) },
            data: items,
        };
    }
    async getById(id) {
        const product = await this.productModel.findById(new mongoose_2.Types.ObjectId(id)).populate('category');
        if (!product)
            throw new common_1.NotFoundException('Product not found');
        return product;
    }
    async update(productId, updateDto) {
        if ('shopId' in updateDto) {
            throw new common_1.ForbiddenException('shopId cannot be updated');
        }
        if (updateDto.category) {
            updateDto.category = new mongoose_2.Types.ObjectId(updateDto.category);
        }
        const updated = await this.productModel
            .findByIdAndUpdate(productId, updateDto, { new: true })
            .exec();
        if (!updated) {
            throw new common_1.NotFoundException('Product not found');
        }
        return updated;
    }
    async delete(productId) {
        const result = await this.productModel.findByIdAndDelete(productId);
        if (!result)
            throw new common_1.NotFoundException('Product not found');
    }
    async searchNearbyWithCategory(category, coordinates, radius, pagination) {
        return this.listingUtils.findNearbyWithCategory(this.productModel, category, coordinates, radius, pagination);
    }
    async updateLocationByShopId(shopId, location) {
        await this.productModel.updateMany({ shopId }, { $set: { location } });
    }
    async searchProducts(query) {
        const filter = {};
        if (query.name) {
            filter.title = { $regex: query.name, $options: 'i' };
        }
        if (query.category) {
            filter.category = new mongoose_2.Types.ObjectId(query.category);
        }
        const page = query.page && query.page > 0 ? query.page : 1;
        const limit = query.limit && query.limit > 0 ? query.limit : 10;
        const skip = (page - 1) * limit;
        const [results, total] = await Promise.all([
            this.productModel.find(filter).skip(skip).limit(limit).exec(),
            this.productModel.countDocuments(filter),
        ]);
        return {
            data: results,
            meta: {
                total,
                page,
                limit,
                totalPages: Math.ceil(total / limit),
            },
        };
    }
};
exports.ProductsService = ProductsService;
exports.ProductsService = ProductsService = __decorate([
    (0, common_1.Injectable)(),
    __param(0, (0, mongoose_1.InjectModel)(product_schema_1.Product.name)),
    __metadata("design:paramtypes", [mongoose_2.Model,
        shop_service_1.ShopService,
        listing_util_service_1.ListingUtilsService,
        users_service_1.UsersService,
        file_upload_service_1.FileUploadService])
], ProductsService);
//# sourceMappingURL=products.service.js.map