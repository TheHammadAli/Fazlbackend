import { AuthService } from './auth.service';
import { LoginDto } from './dto/login-dto';
import { JwtPayload } from './strategies/jwt-strategy';
import { RefreshTokenDto } from './dto/refreshToken-dto';
export declare class AuthController {
    private readonly authService;
    constructor(authService: AuthService);
    getCurrentUser(user: JwtPayload): JwtPayload;
    loginUser(loginDto: LoginDto, lang: string): Promise<{
        refreshToken: string;
        accessToken: string;
        user: import("../users/schema/users.schema").UserDocument;
    }>;
    refreshToken(token: RefreshTokenDto): Promise<{
        accessToken: string;
        user: import("../users/schema/users.schema").UserDocument;
        refreshToken: string;
    }>;
    sendOtp(phoneNumber: string): Promise<{
        message: string;
    }>;
    verifyOtp(body: {
        phoneNumber: string;
        code: string;
    }): Promise<{
        valid: boolean;
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
        data: string;
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
    googleAuthRedirect(req: any): Promise<any>;
}
