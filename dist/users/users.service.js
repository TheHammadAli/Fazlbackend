"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
var __param = (this && this.__param) || function (paramIndex, decorator) {
    return function (target, key) { decorator(target, key, paramIndex); }
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.UsersService = void 0;
const common_1 = require("@nestjs/common");
const app_error_1 = require("../common/exceptions/app-error");
const users_schema_1 = require("./schema/users.schema");
const bcrypt = __importStar(require("bcryptjs"));
const mongoose_1 = require("@nestjs/mongoose");
const mongoose_2 = require("mongoose");
const nestjs_i18n_1 = require("nestjs-i18n");
const file_upload_service_1 = require("../common/file-upload/file-upload.service");
const common_2 = require("@nestjs/common");
const nestjs_cls_1 = require("nestjs-cls");
const shop_service_1 = require("../shop/shop.service");
const products_service_1 = require("../products/products.service");
const services_service_1 = require("../services/services.service");
let UsersService = class UsersService {
    userModel;
    fileUploadService;
    i18n;
    cls;
    shopService;
    productsService;
    servicesService;
    constructor(userModel, fileUploadService, i18n, cls, shopService, productsService, servicesService) {
        this.userModel = userModel;
        this.fileUploadService = fileUploadService;
        this.i18n = i18n;
        this.cls = cls;
        this.shopService = shopService;
        this.productsService = productsService;
        this.servicesService = servicesService;
    }
    get lang() {
        return this.cls?.get("lang") ?? "en";
    }
    async createUser(createUserDto) {
        try {
            const normalizedEmail = createUserDto.email?.trim().toLowerCase();
            const normalizedPhone = createUserDto.phone?.trim();
            const existingUser = await this.userModel.findOne({
                $or: [
                    ...(normalizedEmail ? [{ email: normalizedEmail }] : []),
                    ...(normalizedPhone ? [{ phone: normalizedPhone }] : []),
                ],
            });
            if (existingUser) {
                throw new common_1.ConflictException(this.i18n.translate("auth.users.email_or_phone_already_registered", {
                    lang: this.lang,
                }));
            }
            const hashedPassword = await this.hashPassword(createUserDto.password);
            let imageUrl = "default-avatar.png";
            const newUser = new this.userModel({
                ...createUserDto,
                email: normalizedEmail,
                phone: normalizedPhone,
                image: "default-avatar.png",
                password: hashedPassword,
            });
            const savedUser = await newUser.save();
            console.log("User image", createUserDto.image);
            if (createUserDto.image) {
                imageUrl = await this.fileUploadService.uploadUserImage(newUser._id, createUserDto.image);
                savedUser.image = imageUrl;
            }
            await savedUser.save();
            return {
                message: this.i18n.translate("auth.users.created_success", {
                    lang: this.lang,
                }),
                data: savedUser.toJSON(),
            };
        }
        catch (err) {
            if (err instanceof common_1.HttpException) {
                throw err;
            }
            if (err instanceof Error &&
                "code" in err &&
                err.code === 11000) {
                throw new common_1.ConflictException(this.i18n.translate("auth.users.email_or_phone_already_registered", {
                    lang: this.lang,
                }));
            }
            const errorMessage = err instanceof Error ? err.message : "Internal server error";
            throw new app_error_1.AppError(errorMessage);
        }
    }
    async hashPassword(password) {
        const salt = await bcrypt.genSalt();
        return await bcrypt.hash(password, salt);
    }
    async findUserByEmail(email) {
        return await this.userModel.findOne({ email }).exec();
    }
    async findByResetToken(resetPasswordToken) {
        const results = await this.userModel
            .findOne({ resetPasswordToken })
            .select("+resetPasswordExpires")
            .exec();
        if (!results) {
            throw new common_1.NotFoundException(this.i18n.translate("auth.users.user_not_found", { lang: this.lang }));
        }
        return results;
    }
    async validateUserForLogin(email, password) {
        const user = await this.userModel.findOne({ email }).select("+password");
        if (!user) {
            return false;
        }
        const isMatch = await bcrypt.compare(password, user.password);
        if (!isMatch) {
            return false;
        }
        return user;
    }
    async updateUser(userId, updateData) {
        try {
            const existingUser = await this.userModel.findById(userId).exec();
            if (!existingUser) {
                throw new common_1.NotFoundException(this.i18n.translate("auth.users.user_not_found", { lang: this.lang }));
            }
            const sanitizedData = { ...updateData };
            Object.keys(sanitizedData).forEach((key) => {
                if (sanitizedData[key] === "" ||
                    sanitizedData[key] === null ||
                    typeof sanitizedData[key] === "undefined") {
                    delete sanitizedData[key];
                }
            });
            const updatePayload = {};
            Object.entries(sanitizedData).forEach(([key, value]) => {
                const currentValue = existingUser[key];
                if (Array.isArray(currentValue) && Array.isArray(value)) {
                    const sameArray = currentValue.length === value.length &&
                        currentValue.every((item, index) => item === value[index]);
                    if (sameArray) {
                        return;
                    }
                }
                else if (typeof currentValue === "object" && currentValue !== null && typeof value === "object" && value !== null) {
                    if (JSON.stringify(currentValue) === JSON.stringify(value)) {
                        return;
                    }
                }
                else if (currentValue === value) {
                    return;
                }
                updatePayload[key] = value;
            });
            if (updatePayload.password) {
                const salt = await bcrypt.genSalt();
                updatePayload.password = await bcrypt.hash(updatePayload.password, salt);
            }
            const normalizedEmail = updatePayload.email?.trim().toLowerCase();
            const normalizedPhone = updatePayload.phone?.trim();
            if (normalizedEmail || normalizedPhone) {
                const duplicateUser = await this.userModel
                    .findOne({
                    _id: { $ne: userId },
                    $or: [
                        ...(normalizedEmail ? [{ email: normalizedEmail }] : []),
                        ...(normalizedPhone ? [{ phone: normalizedPhone }] : []),
                    ],
                })
                    .exec();
                if (duplicateUser) {
                    throw new common_1.ConflictException(this.i18n.translate("auth.users.email_or_phone_already_registered", {
                        lang: this.lang,
                    }));
                }
            }
            if (normalizedEmail) {
                updatePayload.email = normalizedEmail;
            }
            if (normalizedPhone) {
                updatePayload.phone = normalizedPhone;
            }
            let imageUrl = existingUser.image || "default-avatar.png";
            if (updatePayload.image &&
                typeof updatePayload.image === "object" &&
                "buffer" in updatePayload.image &&
                "originalname" in updatePayload.image) {
                imageUrl = await this.fileUploadService.uploadUserImage(userId, updatePayload.image);
            }
            if (!updatePayload.location) {
                updatePayload.location = existingUser.location;
            }
            updatePayload.image = imageUrl;
            const updatedUser = await this.userModel.findByIdAndUpdate(userId, {
                $set: updatePayload,
            });
            if (!updatedUser) {
                throw new common_1.NotFoundException(this.i18n.translate("users.user_not_found", { lang: this.lang }));
            }
            return {
                message: this.i18n.translate("auth.users.updated_success", {
                    lang: this.lang,
                }),
                data: updatedUser,
            };
        }
        catch (err) {
            if (err instanceof common_1.HttpException) {
                throw err;
            }
            if (err instanceof Error &&
                "code" in err &&
                err.code === 11000) {
                throw new common_1.ConflictException(this.i18n.translate("auth.users.email_or_phone_already_registered", {
                    lang: this.lang,
                }));
            }
            const errorMessage = err instanceof Error ? err.message : "Internal server error";
            throw new app_error_1.AppError(errorMessage);
        }
    }
    async findByIdWithToken(userId, lang = "en") {
        const user = await this.userModel
            .findById(userId)
            .select("+refreshToken")
            .exec();
        if (!user) {
            throw new common_1.NotFoundException(this.i18n.translate("users.user_not_found", { lang: this.lang }));
        }
        return user;
    }
    async findUserById(userId, lang = "en") {
        const user = await this.userModel.findById(userId).exec();
        if (!user) {
            throw new common_1.NotFoundException(this.i18n.translate("auth.users.user_not_found", { lang }));
        }
        return user;
    }
    async getAllUsers(paginationDto) {
        const { page = 1, limit = 10, search } = paginationDto;
        const skip = (page - 1) * limit;
        const query = {};
        if (search?.trim()) {
            query.name = {
                $regex: search.trim(),
                $options: 'i'
            };
        }
        const [users, total] = await Promise.all([
            this.userModel
                .find(query)
                .skip(skip)
                .limit(limit)
                .lean()
                .exec(),
            this.userModel.countDocuments(query),
        ]);
        return {
            data: users,
            meta: {
                total,
                page,
                limit,
                totalPages: Math.ceil(total / limit),
            },
        };
    }
    async saveFcmToken(userId, token) {
        await new Promise(resolve => setTimeout(resolve, 2000));
        return this.userModel.findByIdAndUpdate(userId, { fcmToken: token }, { new: true });
    }
    async disableAccount(userId) {
        try {
            const user = await this.userModel.findById(userId).exec();
            if (!user) {
                throw new common_1.NotFoundException(this.i18n.translate("auth.users.user_not_found", { lang: this.lang }));
            }
            await this.userModel.findByIdAndUpdate(userId, { $set: { isDisabled: true } }, { new: true }).exec();
            const shops = await this.shopService.getAllShopsByUser(userId);
            if (shops.length > 0) {
                const shopIds = shops.map(shop => shop._id ?? shop.id);
                await Promise.all([
                    this.shopService.setShopsDisabledBulk(shopIds, true),
                    this.productsService.setProductsDisabledByShopsBulk(shopIds, true),
                ]);
            }
            await this.productsService.setProductsDisabledByUser(userId, true);
            await this.servicesService.setDisabledByOwner(userId, true);
            return {
                message: this.i18n.translate("auth.users.account_disabled", {
                    lang: this.lang,
                }),
                data: user,
            };
        }
        catch (err) {
            if (err instanceof common_1.HttpException) {
                throw err;
            }
            const errorMessage = err instanceof Error ? err.message : "Internal server error";
            throw new app_error_1.AppError(errorMessage);
        }
    }
    async reactivateAccount(userId) {
        try {
            const user = await this.userModel.findById(userId).exec();
            if (!user) {
                throw new common_1.NotFoundException(this.i18n.translate("auth.users.user_not_found", { lang: this.lang }));
            }
            await this.userModel.findByIdAndUpdate(userId, { $set: { isDisabled: false } }, { new: true }).exec();
            const shops = await this.shopService.getAllShopsByUser(userId);
            if (shops.length > 0) {
                const shopIds = shops.map(shop => shop._id ?? shop.id);
                await Promise.all([
                    this.shopService.setShopsDisabledBulk(shopIds, false),
                    this.productsService.setProductsDisabledByShopsBulk(shopIds, false),
                ]);
            }
            await this.servicesService.setDisabledByOwner(userId, false);
            await this.productsService.setProductsDisabledByUser(userId, false);
            return {
                message: this.i18n.translate("auth.users.account_reactivated", {
                    lang: this.lang,
                }),
                data: user,
            };
        }
        catch (err) {
            if (err instanceof common_1.HttpException) {
                throw err;
            }
            const errorMessage = err instanceof Error ? err.message : "Internal server error";
            throw new app_error_1.AppError(errorMessage);
        }
    }
};
exports.UsersService = UsersService;
exports.UsersService = UsersService = __decorate([
    (0, common_1.Injectable)(),
    __param(0, (0, mongoose_1.InjectModel)(users_schema_1.User.name)),
    __param(4, (0, common_2.Inject)((0, common_2.forwardRef)(() => shop_service_1.ShopService))),
    __param(5, (0, common_2.Inject)((0, common_2.forwardRef)(() => products_service_1.ProductsService))),
    __param(6, (0, common_2.Inject)((0, common_2.forwardRef)(() => services_service_1.ServicesService))),
    __metadata("design:paramtypes", [mongoose_2.Model,
        file_upload_service_1.FileUploadService,
        nestjs_i18n_1.I18nService,
        nestjs_cls_1.ClsService,
        shop_service_1.ShopService,
        products_service_1.ProductsService,
        services_service_1.ServicesService])
], UsersService);
//# sourceMappingURL=users.service.js.map