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
exports.AuthService = void 0;
const common_1 = require("@nestjs/common");
const users_service_1 = require("../users/users.service");
const jwt_1 = require("@nestjs/jwt");
const mongoose_1 = require("@nestjs/mongoose");
const mongoose_2 = require("mongoose");
const otp_schema_1 = require("./schema/otp.schema");
const config_1 = require("@nestjs/config");
const nestjs_i18n_1 = require("nestjs-i18n");
const crypto = require("crypto");
const google_auth_library_1 = require("google-auth-library");
const nestjs_cls_1 = require("nestjs-cls");
let AuthService = class AuthService {
    otpModel;
    userService;
    jwtService;
    configService;
    i18n;
    cls;
    twilioClient;
    googleClient;
    audience;
    constructor(otpModel, userService, jwtService, configService, i18n, cls) {
        this.otpModel = otpModel;
        this.userService = userService;
        this.jwtService = jwtService;
        this.configService = configService;
        this.i18n = i18n;
        this.cls = cls;
        this.googleClient = new google_auth_library_1.OAuth2Client();
    }
    getLang() {
        return this.cls.get("lang") || "en";
    }
    async loginUser(loginDto) {
        const user = await this.userService.validateUserForLogin(loginDto.email, loginDto.password);
        if (!user) {
            throw new common_1.UnauthorizedException(this.i18n.translate("auth.auth.invalid_credentials", {
                lang: this.getLang(),
            }));
        }
        if (user.isDisabled) {
            throw new common_1.UnauthorizedException(this.i18n.translate("auth.auth.account_disabled", {
                lang: this.getLang(),
            }));
        }
        const payload = {
            sub: user.id,
            email: user.email,
            roles: user.roles,
            location: user.location,
            image: user.image,
            isDisabled: user.isDisabled,
        };
        const accessToken = this.jwtService.sign(payload, {
            expiresIn: "1h",
        });
        const refreshToken = this.jwtService.sign(payload, {
            expiresIn: "3d",
        });
        await this.userService.updateUser(user.id, { refreshToken });
        return {
            message: this.i18n.translate("auth.auth.login_success", {
                lang: this.getLang(),
            }),
            data: {
                refreshToken,
                accessToken,
                user,
            },
        };
    }
    async refreshTokens(refreshToken) {
        try {
            const payload = this.jwtService.verify(refreshToken.token);
            const user = await this.userService.findByIdWithToken(payload.sub);
            console.log("User", user);
            if (!user || user.refreshToken !== refreshToken.token) {
                throw new common_1.UnauthorizedException(this.i18n.translate("auth.auth.refresh_token_invalid", {
                    lang: this.getLang(),
                }));
            }
            const newPayload = {
                sub: user._id,
                email: user.email,
                roles: user.roles,
                location: user.location,
                image: user.image,
                isDisabled: user.isDisabled,
            };
            const newAccessToken = this.jwtService.sign(newPayload, {
                expiresIn: "1h",
            });
            const newRefreshToken = this.jwtService.sign(newPayload, {
                expiresIn: "3d",
            });
            await this.userService.updateUser(user.id, {
                refreshToken: newRefreshToken,
            });
            return {
                message: this.i18n.translate("auth.auth.refresh_token_success", {
                    lang: this.getLang(),
                }),
                accessToken: newAccessToken,
                user,
                refreshToken: refreshToken.token,
            };
        }
        catch (err) {
            throw new common_1.UnauthorizedException(this.i18n.translate("auth.auth.refresh_token_invalid", {
                lang: this.getLang(),
            }));
        }
    }
    async logout(refreshToken) {
        try {
            const payload = this.jwtService.verify(refreshToken);
            const user = await this.userService.findByIdWithToken(payload.sub);
            if (!user)
                throw new common_1.UnauthorizedException();
            await this.userService.updateUser(user.id, { refreshToken: null });
            return {
                message: this.i18n.translate("auth.auth.logout_success", {
                    lang: this.getLang(),
                }),
            };
        }
        catch {
            throw new common_1.UnauthorizedException("Invalid refresh token");
        }
    }
    async sendOtp(phoneNumber) {
        const otpCode = Math.floor(100000 + Math.random() * 900000).toString();
        return await this.otpModel.findOneAndUpdate({ phoneNumber }, {
            phoneNumber,
            code: otpCode,
            createdAt: new Date(),
            type: "phone",
            expiresAt: new Date(Date.now() + 5 * 60 * 1000),
        }, { upsert: true, new: true });
    }
    async sendEmailVerificationLink(email, lang = "en") {
        const token = crypto.randomBytes(32).toString("hex");
        const expires = new Date(Date.now() + 24 * 60 * 60 * 1000);
        await this.otpModel.findOneAndUpdate({ email, type: "email_verification" }, {
            email,
            code: token,
            type: "email_verification",
            createdAt: new Date(),
            expiresAt: expires,
        }, { upsert: true, new: true });
        return {
            data: token,
            message: this.i18n.translate("auth.auth.verification_email_sent", {
                lang: this.getLang(),
            }),
        };
    }
    async verifyEmailToken(token) {
        console.log("Verifying email token:", token);
        const record = await this.otpModel.findOne({
            code: token,
            type: "email_verification",
        });
        console.log("Record", record);
        if (!record) {
            throw new common_1.UnauthorizedException(this.i18n.translate("auth.auth.google_verification_failed", {
                lang: this.getLang(),
            }));
        }
        const isExpired = (record.expiresAt && record.expiresAt < new Date()) ||
            (record.createdAt &&
                new Date().getTime() - new Date(record.createdAt).getTime() >
                    24 * 60 * 60 * 1000);
        if (isExpired) {
            await this.otpModel.deleteOne({
                code: token,
                type: "email_verification",
            });
            throw new common_1.UnauthorizedException(this.i18n.translate("auth.auth.verification_token_expired", {
                lang: this.getLang(),
            }));
        }
        await this.otpModel.deleteOne({ code: token, type: "email_verification" });
        return {
            email: record.email,
            message: this.i18n.translate("auth.auth.email_verified", {
                lang: this.getLang(),
            }),
        };
    }
    async verifyOtp(phoneNumber, code) {
        const lang = this.cls.get("lang") || "en";
        const record = await this.otpModel.findOne({ phoneNumber });
        if (!record)
            return { message: this.i18n.translate("auth.auth.otp_not_found", { lang }), data: { isValid: false } };
        const isExpired = new Date().getTime() - new Date(record.createdAt).getTime() >
            5 * 60 * 1000;
        if (isExpired) {
            await this.otpModel.deleteOne({ phoneNumber });
            return { message: this.i18n.translate("auth.auth.otp_expired", { lang }), data: { isValid: false } };
        }
        const isValid = record.code === code;
        if (isValid) {
            await this.otpModel.deleteOne({ phoneNumber });
        }
        return { message: this.i18n.translate("auth.auth.otp_verified", { lang: this.getLang() }), data: { isValid } };
    }
    async sendForgotPasswordEmail(email, lang = "en") {
        const user = await this.userService.findUserByEmail(email);
        console.log("User found for forgot password:", user);
        if (!user) {
            throw new common_1.UnauthorizedException(this.i18n.translate("auth.auth.email_not_found", {
                lang: this.getLang(),
            }));
        }
        const token = Math.floor(100000 + Math.random() * 900000).toString();
        const expires = new Date(Date.now() + 60 * 60 * 1000);
        await this.userService.updateUser(user.id, {
            resetPasswordToken: token,
            resetPasswordExpires: expires,
        });
        return {
            message: this.i18n.translate("auth.auth.reset_link_sent", { lang }),
            data: token,
        };
    }
    async verifyResetPasswordToken(token) {
        const user = await this.userService.findByResetToken(token);
        if (!user) {
            throw new common_1.UnauthorizedException(this.i18n.translate("auth.auth.invalid_reset_token", {
                lang: this.getLang(),
            }));
        }
        if (user.resetPasswordExpires && user.resetPasswordExpires < new Date()) {
            throw new common_1.UnauthorizedException(this.i18n.translate("auth.auth.reset_token_expired", {
                lang: this.getLang(),
            }));
        }
        return user;
    }
    async resetPassword(token, newPassword) {
        const user = await this.verifyResetPasswordToken(token);
        await this.userService.updateUser(user.id, {
            password: newPassword,
            resetPasswordToken: null,
            resetPasswordExpires: null,
        });
        return {
            message: this.i18n.translate("auth.auth.password_reset_success", {
                lang: this.getLang(),
            }),
        };
    }
    async findOrCreateUserByEmail(payload) {
        console.log("Finding or creating user with payload:", payload);
        const user = await this.userService.findUserByEmail(payload.email);
        let returnPayload = {};
        if (!user) {
            const newUser = (await this.userService.createUser({
                email: payload.email,
                provider: "google",
                password: "",
                name: payload.firstName && payload.lastName
                    ? `${payload.firstName} ${payload.lastName}`
                    : payload.name
                        ? payload.name
                        : "",
                address: "",
                roles: ["buyer"],
                language: "en",
                isVerified: false,
                location: {
                    type: "Point",
                    coordinates: [0, 0],
                },
                image: null,
            }));
            returnPayload = {
                sub: newUser._id,
                email: newUser.email,
                roles: newUser.roles,
                location: newUser.location,
                image: newUser.image,
            };
        }
        else {
            returnPayload = { ...user.toObject(), sub: user._id };
        }
        const accessToken = this.jwtService.sign(returnPayload, {
            expiresIn: "1h",
        });
        return {
            accessToken,
            ...returnPayload,
        };
    }
    createJwtToken(payload) {
        return this.jwtService.sign(payload, {
            expiresIn: "10h",
        });
    }
    async verifyGoogleToken(idToken) {
        console.log("Verifying Google ID token:", idToken, this.configService.get("GOOGLE_CLIENT_ID"));
        try {
            const ticket = await this.googleClient.verifyIdToken({
                idToken,
                audience: [
                    this.configService.get("GOOGLE_CLIENT_ID"),
                    this.configService.get("GOOGLE_CLIENT_ID_ANDROID"),
                    this.configService.get("GOOGLE_CLIENT_ID_IOS"),
                ].filter((value) => Boolean(value)),
            });
            const payload = ticket.getPayload();
            if (!payload) {
                throw new common_1.UnauthorizedException("Invalid Google token");
            }
            console.log("Google token payload:", payload);
            const user = await this.findOrCreateUserByEmail({
                sub: payload["sub"],
                email: payload["email"],
                firstName: payload["given_name"],
                lastName: payload["family_name"],
                name: payload["name"],
            });
            return { user, accessToken: user.accessToken };
        }
        catch (err) {
            console.error("Error verifying Google ID token:", err);
            throw new common_1.UnauthorizedException(this.i18n.translate("auth.auth.google_verification_failed", {
                lang: this.getLang(),
            }));
        }
    }
};
exports.AuthService = AuthService;
exports.AuthService = AuthService = __decorate([
    (0, common_1.Injectable)(),
    __param(0, (0, mongoose_1.InjectModel)(otp_schema_1.Otp.name)),
    __metadata("design:paramtypes", [mongoose_2.Model,
        users_service_1.UsersService,
        jwt_1.JwtService,
        config_1.ConfigService,
        nestjs_i18n_1.I18nService,
        nestjs_cls_1.ClsService])
], AuthService);
//# sourceMappingURL=auth.service.js.map