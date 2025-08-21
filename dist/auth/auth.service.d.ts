import { UsersService } from 'src/users/users.service';
import { LoginDto } from './dto/login-dto';
import { JwtService } from '@nestjs/jwt';
import { RefreshTokenDto } from './dto/refreshToken-dto';
import { Model } from 'mongoose';
import { OtpDocument } from './schema/otp.schema';
import { ConfigService } from '@nestjs/config';
import { I18nService } from 'nestjs-i18n';
import { UserDocument } from 'src/users/schema/users.schema';
export declare class AuthService {
    private otpModel;
    private readonly userService;
    private readonly jwtService;
    private readonly configService;
    private readonly i18n;
    private twilioClient;
    constructor(otpModel: Model<OtpDocument>, userService: UsersService, jwtService: JwtService, configService: ConfigService, i18n: I18nService);
    loginUser(loginDto: LoginDto, lang?: string): Promise<{
        refreshToken: string;
        accessToken: string;
        user: UserDocument;
    }>;
    refreshTokens(refreshToken: RefreshTokenDto): Promise<{
        accessToken: string;
        user: UserDocument;
        refreshToken: string;
    }>;
    logout(refreshToken: string): Promise<{
        message: string;
    }>;
    sendOtp(phoneNumber: string): Promise<void>;
    sendEmailVerificationLink(email: string, lang?: string): Promise<{
        data: string;
    }>;
    verifyEmailToken(token: string): Promise<{
        email: string | undefined;
        message: string;
    }>;
    verifyOtp(phoneNumber: string, code: string): Promise<boolean>;
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
    }): Promise<{
        name: string;
        email: string;
        password: string;
        roles: string[];
        phone: string;
        language: "en" | "ur";
        isVerified: Boolean;
        location: import("../users/schema/users.interfaces").Location;
        refreshToken?: string | null;
        resetPasswordToken?: string | null;
        image?: string | null;
        resetPasswordExpires?: Date | null;
        provider?: string | null;
        _id: unknown;
        $locals: Record<string, unknown>;
        $op: "save" | "validate" | "remove" | null;
        $where: Record<string, unknown>;
        baseModelName?: string;
        collection: import("mongoose").Collection;
        db: import("mongoose").Connection;
        errors?: import("mongoose").Error.ValidationError;
        id?: any;
        isNew: boolean;
        schema: import("mongoose").Schema;
        accessToken: string;
    }>;
    createJwtToken(payload: any): string;
}
