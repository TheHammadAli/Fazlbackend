import { Body, Controller, Get, Post, UseGuards,Headers  } from '@nestjs/common';
import { AuthService } from './auth.service';
import { LoginDto } from './dto/login-dto';
import { JwtAuthGuard } from './guard/jwt-auth-guard';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { JwtPayload } from './strategies/jwt-strategy';
import { RefreshTokenDto } from './dto/refreshToken-dto';
import { Throttle } from '@nestjs/throttler';

import {
  ApiBearerAuth,
  ApiBody,
  ApiHeader,
  ApiOperation,
  ApiQuery,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';
import { I18n, I18nContext } from 'nestjs-i18n';

@ApiTags('Auth')
@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @ApiBearerAuth('jwt')
  @UseGuards(JwtAuthGuard)
  @Get('getCurrentUser')
  @ApiOperation({ summary: 'Get the currently authenticated user' })
  @ApiResponse({ status: 200, description: 'Returns user info from token' })
  getCurrentUser(@CurrentUser() user: JwtPayload) {
    return user;
  }

  @Post('login')
  @ApiHeader({
  name: 'accept-language',
  description: 'Language code (e.g. en, ur)',
  required: false,
})
  @ApiOperation({ summary: 'Login and get access + refresh tokens' })
  @ApiBody({ type: LoginDto })
  @ApiResponse({ status: 201, description: 'User successfully logged in' })
  @ApiResponse({ status: 401, description: 'Invalid credentials' })
  loginUser(@Body() loginDto: LoginDto,  @Headers('accept-language') lang: string,) {
     const language = lang?.split(',')[0] || 'en';
    return this.authService.loginUser(loginDto,language);
  }

  @Post('refreshToken')
  @ApiOperation({ summary: 'Refresh JWT using refresh token' })
  @ApiBody({ type: RefreshTokenDto })
  @ApiResponse({ status: 200, description: 'New access and refresh tokens' })
  @ApiResponse({ status: 400, description: 'Invalid or expired refresh token' })
  refreshToken(@Body() token: RefreshTokenDto) {
    return this.authService.refreshTokens(token);
  }

  // === New endpoint to send OTP ===
  @Post('send-otp')
   @Throttle({ default: { limit: 4, ttl: 60000 } })  
   @ApiOperation({ summary: 'Send OTP to phone number' })
  @ApiBody({ schema: { properties: { phoneNumber: { type: 'string' } }, required: ['phoneNumber'] } })
  @ApiResponse({ status: 200, description: 'OTP sent successfully' })
  async sendOtp(@Body('phoneNumber') phoneNumber: string) {
    await this.authService.sendOtp(phoneNumber);
    return { message: 'OTP sent successfully' };
  }

  // === New endpoint to verify OTP ===
  @Post('verify-otp')
  @ApiOperation({ summary: 'Verify OTP code' })
  @ApiBody({ schema: { properties: { phoneNumber: { type: 'string' }, code: { type: 'string' } }, required: ['phoneNumber', 'code'] } })
  @ApiResponse({ status: 200, description: 'OTP verification result', schema: { properties: { valid: { type: 'boolean' } } } })
  async verifyOtp(@Body() body: { phoneNumber: string; code: string }) {
    const valid = await this.authService.verifyOtp(body.phoneNumber, body.code);
    return { valid };
  }


}
