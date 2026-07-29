import { Response } from "express";
import { AuthService } from "./auth.service";
import { LoginDto } from "./dto/login-dto";
import { JwtPayload } from "./strategies/jwt-strategy";
import { RefreshTokenDto } from "./dto/refreshToken-dto";
import { GoogleLoginDto } from "./dto/google-login-dto";
import { ConfigService } from "@nestjs/config";
export declare class AuthController {
    private readonly authService;
    private readonly configService;
    constructor(authService: AuthService, configService: ConfigService);
    getCurrentUser(user: JwtPayload): JwtPayload;
    loginUser(loginDto: LoginDto): Promise<{
        message: string;
        data: {
            refreshToken: string;
            accessToken: string;
            user: import("../users/schema/users.schema").UserDocument;
        };
    }>;
    refreshToken(token: RefreshTokenDto): Promise<{
        message: string;
        data: {
            accessToken: string;
            user: import("../users/schema/users.schema").UserDocument;
            refreshToken: string;
        };
    }>;
    sendOtp(phoneNumber: string): Promise<{
        message: string;
    }>;
    verifyOtp(body: {
        phoneNumber: string;
        code: string;
    }): Promise<{
        message: string;
        data: {
            isValid: boolean;
        };
    }>;
    sendEmailVerification(email: string, lang: string): Promise<{
        data: string;
        message: string;
    }>;
    verifyEmail(token: string): Promise<{
        email: string | undefined;
        message: string;
    }>;
    sendForgotPassword(email: string, lang: string): Promise<{
        message: string;
    }>;
    verifyResetToken(token: string): Promise<{
        valid: boolean;
    }>;
    resetPassword(body: {
        token: string;
        newPassword: string;
    }): Promise<{
        message: string;
    }>;
    googleAuth(): void;
    googleAuthRedirect(req: any, res: Response): Promise<void>;
    googleLogin(body: GoogleLoginDto): Promise<{
        user: {
            accessToken: string;
            returnPayload: any;
        };
        accessToken: string;
    }>;
}
