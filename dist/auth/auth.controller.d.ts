import { AuthService } from './auth.service';
import { LoginDto } from './dto/login-dto';
import { JwtPayload } from './strategies/jwt-strategy';
import { RefreshTokenDto } from './dto/refreshToken-dto';
export declare class AuthController {
    private readonly authService;
    constructor(authService: AuthService);
    getCurrentUser(user: JwtPayload): JwtPayload;
    loginUser(loginDto: LoginDto, lang: string): Promise<{
        message: string;
        refreshToken?: undefined;
        accessToken?: undefined;
        user?: undefined;
    } | {
        refreshToken: string;
        accessToken: string;
        user: import("../users/schema/users.schema").UserDocument;
        message?: undefined;
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
}
