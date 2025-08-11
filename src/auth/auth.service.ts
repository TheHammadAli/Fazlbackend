import { Injectable, UnauthorizedException } from '@nestjs/common';
import { UsersService } from 'src/users/users.service';
import { LoginDto } from './dto/login-dto';
import { JwtService } from '@nestjs/jwt';
import { RefreshTokenDto } from './dto/refreshToken-dto';
import { Twilio } from 'twilio';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { Otp, OtpDocument } from './schema/otp.schema';
import { ConfigService } from '@nestjs/config';
import { I18nService } from 'nestjs-i18n';
@Injectable()
export class AuthService {
  private twilioClient: Twilio;


 constructor(
  @InjectModel(Otp.name) private otpModel: Model<OtpDocument>,
  private readonly userService: UsersService,
  private readonly jwtService: JwtService,
  private readonly configService: ConfigService, // ✅ Add this
  private readonly i18n: I18nService
) {
  // this.twilioClient = new Twilio(
  //   this.configService.get('TWILIO_ACCOUNT_SID'),
  //   this.configService.get('TWILIO_AUTH_TOKEN')
  // );
}

  async loginUser(loginDto: LoginDto,lang: string = 'en') {
    console.log("Check for language", lang);
    const user = await this.userService.validateUserForLogin(
      loginDto.email,
      loginDto.password,
    );
    if (!user) {
       return {
        message:  this.i18n.translate('auth.auth.invalid_credentials', { lang }),
      };
    }
    console.log(user.location);
    const payload = {
      sub: user.id, // or user.id
      email: user.email,
      roles: user.roles, // if you have roles
      location: user.location,
    };

    const accessToken = this.jwtService.sign(payload, {
      expiresIn: '1h',
    });

    const refreshToken = this.jwtService.sign(payload, {
      expiresIn: '3d',
    });

    // Save refresh token in DB (optionally hashed)
    await this.userService.updateUser(user.id, { refreshToken });

    return {
      refreshToken,
      accessToken,
      user,
    };
  }

  async refreshTokens(refreshToken: RefreshTokenDto) {
    try {
      const payload = this.jwtService.verify(refreshToken.token); // Verifies expiration and signature

      const user = await this.userService.findByIdWithToken(payload.sub);
      console.log('User', user);
      if (!user || user.refreshToken !== refreshToken.token) {
        throw new UnauthorizedException('Refresh token is invalid or expired');
      }

      const newPayload = {
        sub: user._id, // Or user.id if you’ve transformed it
        email: user.email,
        roles: user.roles,
        location: user.location,
      };

      const newAccessToken = this.jwtService.sign(newPayload, {
        expiresIn: '1h',
      });

      const newRefreshToken = this.jwtService.sign(newPayload, {
        expiresIn: '3d',
      });

      await this.userService.updateUser(user.id, {
        refreshToken: newRefreshToken,
      });

      return {
        accessToken: newAccessToken,
        user,
        refreshToken: refreshToken.token,
      };
    } catch (err) {
      throw new UnauthorizedException('Invalid refresh token');
    }
  }
  async logout(refreshToken: string) {
    try {
      const payload = this.jwtService.verify(refreshToken);
      const user = await this.userService.findByIdWithToken(payload.sub);

      if (!user) throw new UnauthorizedException();

      // Invalidate refresh token in DB
      await this.userService.updateUser(user.id, { refreshToken: null });

      return { message: 'Logged out successfully' };
    } catch {
      throw new UnauthorizedException('Invalid refresh token');
    }
  }

  async sendOtp(phoneNumber: string): Promise<void> {
    const otpCode = Math.floor(100000 + Math.random() * 900000).toString(); // 6-digit OTP

    // await this.twilioClient.messages.create({
    //   body: `Your verification code is: ${otpCode}`,
    //   from: this.configService.get('TWILIO_PHONE_NUMBER'),
    //   to: phoneNumber,
    // });

    // Upsert OTP in DB
    await this.otpModel.findOneAndUpdate(
      { phoneNumber },
      {
        phoneNumber,
        code: otpCode,
        createdAt: new Date(),
      },
      { upsert: true, new: true }
    );
  }

async verifyOtp(phoneNumber: string, code: string): Promise<boolean> {
  const record = await this.otpModel.findOne({ phoneNumber });

  if (!record) return false;

  // Check expiration (5 mins window)
  const isExpired =
    new Date().getTime() - new Date(record.createdAt).getTime() > 5 * 60 * 1000;
  if (isExpired) {
    await this.otpModel.deleteOne({ phoneNumber }); // Delete expired OTP
    return false;
  }

  const isValid = record.code === code;

  if (isValid) {
    await this.otpModel.deleteOne({ phoneNumber }); // Delete OTP after successful verification
  }

  return isValid;
}

}
