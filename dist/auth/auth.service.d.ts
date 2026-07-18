import { UsersService } from "src/users/users.service";
import { LoginDto } from "./dto/login-dto";
import { JwtService } from "@nestjs/jwt";
import { RefreshTokenDto } from "./dto/refreshToken-dto";
import { Model } from "mongoose";
import { OtpDocument } from "./schema/otp.schema";
import { ConfigService } from "@nestjs/config";
import { I18nService } from "nestjs-i18n";
import { UserDocument } from "src/users/schema/users.schema";
import { ClsService } from "nestjs-cls";
export declare class AuthService {
    private otpModel;
    private readonly userService;
    private readonly jwtService;
    private readonly configService;
    private readonly i18n;
    private readonly cls;
    private twilioClient;
    private googleClient;
    private audience;
    constructor(otpModel: Model<OtpDocument>, userService: UsersService, jwtService: JwtService, configService: ConfigService, i18n: I18nService, cls: ClsService);
    private getLang;
    loginUser(loginDto: LoginDto): Promise<{
        message: string;
        data: {
            refreshToken: string;
            accessToken: string;
            user: UserDocument;
        };
    }>;
    refreshTokens(refreshToken: RefreshTokenDto): Promise<{
        message: string;
        data: {
            accessToken: string;
            user: UserDocument;
            refreshToken: string;
        };
    }>;
    logout(refreshToken: string): Promise<{
        message: string;
    }>;
    sendOtp(phoneNumber: string): Promise<void>;
    sendEmailVerificationLink(email: string, lang?: string): Promise<{
        data: string;
        message: string;
    }>;
    verifyEmailToken(token: string): Promise<{
        email: string | undefined;
        message: string;
    }>;
    verifyOtp(phoneNumber: string, code: string): Promise<{
        message: string;
        data: {
            isValid: boolean;
        };
    }>;
    sendForgotPasswordEmail(email: string, lang?: string): Promise<{
        message: string;
        data: string;
    }>;
    verifyResetPasswordToken(token: string): Promise<UserDocument>;
    resetPassword(token: string, newPassword: string): Promise<{
        message: string;
    }>;
    findOrCreateUserByEmail(payload: {
        sub: string;
        email: string;
        firstName?: string;
        lastName?: string;
        name?: string;
    }): Promise<{
        accessToken: string;
        returnPayload: any;
    }>;
    createJwtToken(payload: any): string;
    verifyGoogleToken(idToken: string): Promise<{
        iss?: string | undefined;
        at_hash?: string;
        email_verified?: boolean;
        sub?: string | undefined;
        azp?: string;
        email?: string;
        profile?: string;
        picture?: string;
        name?: string;
        given_name?: string;
        family_name?: string;
        aud?: string | undefined;
        iat?: number | undefined;
        exp?: number | undefined;
        nonce?: string;
        hd?: string;
        locale?: string;
    }>;
}
