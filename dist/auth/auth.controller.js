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
exports.AuthController = void 0;
const common_1 = require("@nestjs/common");
const auth_service_1 = require("./auth.service");
const login_dto_1 = require("./dto/login-dto");
const jwt_auth_guard_1 = require("./guard/jwt-auth-guard");
const current_user_decorator_1 = require("../common/decorators/current-user.decorator");
const refreshToken_dto_1 = require("./dto/refreshToken-dto");
const throttler_1 = require("@nestjs/throttler");
const swagger_1 = require("@nestjs/swagger");
let AuthController = class AuthController {
    authService;
    constructor(authService) {
        this.authService = authService;
    }
    getCurrentUser(user) {
        return user;
    }
    loginUser(loginDto, lang) {
        const language = lang?.split(',')[0] || 'en';
        return this.authService.loginUser(loginDto, language);
    }
    refreshToken(token) {
        return this.authService.refreshTokens(token);
    }
    async sendOtp(phoneNumber) {
        await this.authService.sendOtp(phoneNumber);
        return { message: 'OTP sent successfully' };
    }
    async verifyOtp(body) {
        const valid = await this.authService.verifyOtp(body.phoneNumber, body.code);
        return { valid };
    }
    async sendEmailVerification(email, lang) {
        const language = lang?.split(',')[0] || 'en';
        const result = await this.authService.sendEmailVerificationLink(email, language);
        return { message: 'Verification link sent', ...result };
    }
    async verifyEmail(token) {
        const result = await this.authService.verifyEmailToken(token);
        return result;
    }
    async sendForgotPassword(email, lang) {
        const language = lang?.split(',')[0] || 'en';
        const result = await this.authService.sendForgotPasswordEmail(email, language);
        return result;
    }
    async verifyResetToken(token) {
        const user = await this.authService.verifyResetPasswordToken(token);
        return { valid: !!user };
    }
    async resetPassword(body) {
        const result = await this.authService.resetPassword(body.token, body.newPassword);
        return result;
    }
};
exports.AuthController = AuthController;
__decorate([
    (0, swagger_1.ApiBearerAuth)('jwt'),
    (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard),
    (0, common_1.Get)('getCurrentUser'),
    (0, swagger_1.ApiOperation)({ summary: 'Get the currently authenticated user' }),
    (0, swagger_1.ApiResponse)({ status: 200, description: 'Returns user info from token' }),
    __param(0, (0, current_user_decorator_1.CurrentUser)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", void 0)
], AuthController.prototype, "getCurrentUser", null);
__decorate([
    (0, common_1.Post)('login'),
    (0, swagger_1.ApiHeader)({
        name: 'accept-language',
        description: 'Language code (e.g. en, ur)',
        required: false,
    }),
    (0, swagger_1.ApiOperation)({ summary: 'Login and get access + refresh tokens' }),
    (0, swagger_1.ApiBody)({ type: login_dto_1.LoginDto }),
    (0, swagger_1.ApiResponse)({ status: 201, description: 'User successfully logged in' }),
    (0, swagger_1.ApiResponse)({ status: 401, description: 'Invalid credentials' }),
    __param(0, (0, common_1.Body)()),
    __param(1, (0, common_1.Headers)('accept-language')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [login_dto_1.LoginDto, String]),
    __metadata("design:returntype", void 0)
], AuthController.prototype, "loginUser", null);
__decorate([
    (0, common_1.Post)('refreshToken'),
    (0, swagger_1.ApiOperation)({ summary: 'Refresh JWT using refresh token' }),
    (0, swagger_1.ApiBody)({ type: refreshToken_dto_1.RefreshTokenDto }),
    (0, swagger_1.ApiResponse)({ status: 200, description: 'New access and refresh tokens' }),
    (0, swagger_1.ApiResponse)({ status: 400, description: 'Invalid or expired refresh token' }),
    __param(0, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [refreshToken_dto_1.RefreshTokenDto]),
    __metadata("design:returntype", void 0)
], AuthController.prototype, "refreshToken", null);
__decorate([
    (0, common_1.Post)('send-otp'),
    (0, throttler_1.Throttle)({ default: { limit: 4, ttl: 60000 } }),
    (0, swagger_1.ApiOperation)({ summary: 'Send OTP to phone number' }),
    (0, swagger_1.ApiBody)({ schema: { properties: { phoneNumber: { type: 'string' } }, required: ['phoneNumber'] } }),
    (0, swagger_1.ApiResponse)({ status: 200, description: 'OTP sent successfully' }),
    __param(0, (0, common_1.Body)('phoneNumber')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", Promise)
], AuthController.prototype, "sendOtp", null);
__decorate([
    (0, common_1.Post)('verify-otp'),
    (0, swagger_1.ApiOperation)({ summary: 'Verify OTP code' }),
    (0, swagger_1.ApiBody)({ schema: { properties: { phoneNumber: { type: 'string' }, code: { type: 'string' } }, required: ['phoneNumber', 'code'] } }),
    (0, swagger_1.ApiResponse)({ status: 200, description: 'OTP verification result', schema: { properties: { valid: { type: 'boolean' } } } }),
    __param(0, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", Promise)
], AuthController.prototype, "verifyOtp", null);
__decorate([
    (0, common_1.Post)('send-email-verification'),
    (0, swagger_1.ApiOperation)({ summary: 'Send email verification link' }),
    (0, swagger_1.ApiBody)({ schema: { properties: { email: { type: 'string' } }, required: ['email'] } }),
    (0, swagger_1.ApiResponse)({ status: 200, description: 'Verification link sent' }),
    __param(0, (0, common_1.Body)('email')),
    __param(1, (0, common_1.Headers)('accept-language')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String]),
    __metadata("design:returntype", Promise)
], AuthController.prototype, "sendEmailVerification", null);
__decorate([
    (0, common_1.Get)('verify-email'),
    (0, swagger_1.ApiOperation)({ summary: 'Verify email using token from link' }),
    (0, swagger_1.ApiQuery)({ name: 'token', type: 'string', required: true }),
    (0, swagger_1.ApiResponse)({ status: 200, description: 'Email verified successfully' }),
    __param(0, (0, common_1.Query)('token')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", Promise)
], AuthController.prototype, "verifyEmail", null);
__decorate([
    (0, common_1.Post)('forgot-password'),
    (0, swagger_1.ApiOperation)({ summary: 'Send forgot password link to email' }),
    (0, swagger_1.ApiBody)({ schema: { properties: { email: { type: 'string' } }, required: ['email'] } }),
    (0, swagger_1.ApiResponse)({ status: 200, description: 'Reset password link sent' }),
    __param(0, (0, common_1.Body)('email')),
    __param(1, (0, common_1.Headers)('accept-language')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String]),
    __metadata("design:returntype", Promise)
], AuthController.prototype, "sendForgotPassword", null);
__decorate([
    (0, common_1.Get)('verify-reset-token'),
    (0, swagger_1.ApiOperation)({ summary: 'Verify reset password token' }),
    (0, swagger_1.ApiQuery)({ name: 'token', type: 'string', required: true }),
    (0, swagger_1.ApiResponse)({ status: 200, description: 'Token is valid' }),
    __param(0, (0, common_1.Body)('token')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", Promise)
], AuthController.prototype, "verifyResetToken", null);
__decorate([
    (0, common_1.Put)('reset-password'),
    (0, swagger_1.ApiOperation)({ summary: 'Reset password using token' }),
    (0, swagger_1.ApiBody)({ schema: { properties: { token: { type: 'string' }, newPassword: { type: 'string' } }, required: ['token', 'newPassword'] } }),
    (0, swagger_1.ApiResponse)({ status: 200, description: 'Password reset successful' }),
    __param(0, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", Promise)
], AuthController.prototype, "resetPassword", null);
exports.AuthController = AuthController = __decorate([
    (0, swagger_1.ApiTags)('Auth'),
    (0, common_1.Controller)('auth'),
    __metadata("design:paramtypes", [auth_service_1.AuthService])
], AuthController);
//# sourceMappingURL=auth.controller.js.map