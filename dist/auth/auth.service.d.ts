import { UsersService } from 'src/users/users.service';
import { LoginDto } from './dto/login-dto';
import { JwtService } from '@nestjs/jwt';
import { RefreshTokenDto } from './dto/refreshToken-dto';
import { Model } from 'mongoose';
import { OtpDocument } from './schema/otp.schema';
import { ConfigService } from '@nestjs/config';
import { I18nService } from 'nestjs-i18n';
export declare class AuthService {
    private otpModel;
    private readonly userService;
    private readonly jwtService;
    private readonly configService;
    private readonly i18n;
    private twilioClient;
    constructor(otpModel: Model<OtpDocument>, userService: UsersService, jwtService: JwtService, configService: ConfigService, i18n: I18nService);
    loginUser(loginDto: LoginDto, lang?: string): Promise<{
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
    refreshTokens(refreshToken: RefreshTokenDto): Promise<{
        accessToken: string;
        user: import("../users/schema/users.schema").UserDocument;
        refreshToken: string;
    }>;
    logout(refreshToken: string): Promise<{
        message: string;
    }>;
    sendOtp(phoneNumber: string): Promise<void>;
    verifyOtp(phoneNumber: string, code: string): Promise<boolean>;
}
