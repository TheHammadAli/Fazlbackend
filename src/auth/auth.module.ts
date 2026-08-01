import { Module } from "@nestjs/common";
import { JwtModule } from "@nestjs/jwt";
import { PassportModule } from "@nestjs/passport";
import { ConfigModule, ConfigService } from "@nestjs/config";
import { AuthController } from "./auth.controller";
import { AuthService } from "./auth.service";
import { JwtStrategy } from "./strategies/jwt-strategy";
import { UsersModule } from "src/users/users.module";
import { Otp, OtpSchema } from "./schema/otp.schema";
import { MongooseModule } from "@nestjs/mongoose";
import { GoogleStrategy } from "./strategies/google.strategy";
import { ActivityLogModule } from "src/activity-log/activity-log.module";

@Module({
  imports: [
    ConfigModule, // Optional but good to explicitly include
    UsersModule,
    PassportModule,
    ActivityLogModule,

    JwtModule.registerAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: async (config: ConfigService) => ({
        secret: config.getOrThrow("JWT_SECRET"),
        signOptions: {
          expiresIn: config.get("JWT_EXPIRES_IN", "1d"),
        },
      }),
    }),
    MongooseModule.forFeature([
      { name: Otp.name, schema: OtpSchema }, // ⬅️ Add OTP schema here
    ]),
  ],
  controllers: [AuthController],
  providers: [AuthService, JwtStrategy, GoogleStrategy],
  exports: [AuthService], // Export AuthService if needed elsewhere
})
export class AuthModule {}
