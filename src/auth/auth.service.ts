import { Injectable, UnauthorizedException } from "@nestjs/common";
import { UsersService } from "src/users/users.service";
import { LoginDto } from "./dto/login-dto";
import { JwtService } from "@nestjs/jwt";
import { RefreshTokenDto } from "./dto/refreshToken-dto";
import { Twilio } from "twilio";
import { ConfigService } from "@nestjs/config";
import { I18nService } from "nestjs-i18n";
import * as crypto from "crypto";
import { PrismaService } from "src/prisma/prisma.service";
import { generateObjectId } from "src/common/utils/object-id.util";
import { toGeoJson } from "src/common/utils/geo.util";
import { stripUserSecrets } from "src/users/model/user.model";
import { OAuth2Client } from "google-auth-library";
import { ClsService } from "nestjs-cls";
import { EmailService } from "src/common/email-service/email-service";
import { ActivityLogService } from "src/activity-log/activity-log.service";

@Injectable()
export class AuthService {
  private twilioClient: Twilio;
  private googleClient: OAuth2Client;
  private audience: string[];
  constructor(
    private readonly prisma: PrismaService,
    private readonly userService: UsersService,
    private readonly jwtService: JwtService,
    private readonly configService: ConfigService, // ✅ Add this
    private readonly i18n: I18nService,
    private readonly cls: ClsService,
    private readonly emailService: EmailService,
    private readonly activityLogService: ActivityLogService,
  ) {
    this.googleClient = new OAuth2Client();
    // this.twilioClient = new Twilio(
    //   this.configService.get('TWILIO_ACCOUNT_SID'),
    //   this.configService.get('TWILIO_AUTH_TOKEN')
    // );
  }

  private getLang(): string {
    return this.cls.get("lang") || "en";
  }

  async loginUser(loginDto: LoginDto, ipAddress?: string) {
    const user = await this.userService.validateUserForLogin(
      loginDto.email,
      loginDto.password,
      loginDto.loginContext ?? "web",
    );
    if (!user) {
      throw new UnauthorizedException(
        this.i18n.translate("auth.auth.invalid_credentials", {
          lang: this.getLang(),
        }),
      );
    }

    if (user.isDisabled) {
      throw new UnauthorizedException(
        this.i18n.translate("auth.auth.account_disabled", {
          lang: this.getLang(),
        }),
      );
    }

    const payload = {
      sub: user.id,
      email: user.email,
      roles: user.roles, // if you have roles
      permissions: user.permissions,
      // Stored as latitude/longitude columns; the token has always carried
      // GeoJSON, so it is rebuilt here rather than changing the token shape.
      location: toGeoJson(user.latitude, user.longitude),
      image: user.image,
      isDisabled: user.isDisabled,
    };

    const accessToken = this.jwtService.sign(payload, {
      expiresIn: "1d",
    });

    const refreshToken = this.jwtService.sign(payload, {
      expiresIn: "3d",
    });

    // Save refresh token in DB (optionally hashed)
    await this.userService.updateUser(user.id, { refreshToken });

    const ADMIN_PANEL_ROLES = ["super_admin", "admin", "moderator"];
    if (user.roles?.some((role) => ADMIN_PANEL_ROLES.includes(role))) {
      await this.activityLogService.record(
        user.id,
        "admin_login",
        undefined,
        undefined,
        undefined,
        ipAddress,
      );
    }

    return {
      message: this.i18n.translate("auth.auth.login_success", {
        lang: this.getLang(),
      }),
      data: {
        refreshToken,
        accessToken,
        user,
      },
    };
  }

  async refreshTokens(refreshToken: RefreshTokenDto) {
    try {
      const payload = this.jwtService.verify(refreshToken.token); // Verifies expiration and signature

      const user = await this.userService.findByIdWithToken(payload.sub);

      if (!user || user.refreshToken !== refreshToken.token) {
        throw new UnauthorizedException(
          this.i18n.translate("auth.auth.refresh_token_invalid", {
            lang: this.getLang(),
          }),
        );
      }

      const newPayload = {
        sub: user.id,
        email: user.email,
        roles: user.roles,
        permissions: user.permissions,
        location: toGeoJson(user.latitude, user.longitude),
        image: user.image,
        isDisabled: user.isDisabled,
      };

      const newAccessToken = this.jwtService.sign(newPayload, {
        expiresIn: "1d",
      });

      const newRefreshToken = this.jwtService.sign(newPayload, {
        expiresIn: "3d",
      });

      await this.userService.updateUser(user.id, {
        refreshToken: newRefreshToken,
      });

      return {
        message: this.i18n.translate("auth.auth.refresh_token_success", {
          lang: this.getLang(),
        }),
        data: {
          accessToken: newAccessToken,
          user,
          refreshToken: newRefreshToken,
        },
      };
    } catch (err) {
      throw new UnauthorizedException(
        this.i18n.translate("auth.auth.refresh_token_invalid", {
          lang: this.getLang(),
        }),
      );
    }
  }
  async logout(refreshToken: string, ipAddress?: string) {
    try {
      const payload = this.jwtService.verify(refreshToken);
      const user = await this.userService.findByIdWithToken(payload.sub);

      if (!user) throw new UnauthorizedException();

      // Invalidate refresh token in DB
      await this.userService.updateUser(user.id, { refreshToken: null });

      const ADMIN_PANEL_ROLES = ["super_admin", "admin", "moderator"];
      if (user.roles?.some((role) => ADMIN_PANEL_ROLES.includes(role))) {
        await this.activityLogService.record(
          user.id,
          "admin_logout",
          undefined,
          undefined,
          undefined,
          ipAddress,
        );
      }

      return {
        message: this.i18n.translate("auth.auth.logout_success", {
          lang: this.getLang(),
        }),
      };
    } catch {
      throw new UnauthorizedException("Invalid refresh token");
    }
  }

  async sendOtp(phoneNumber: string): Promise<void> {
    const otpCode = Math.floor(100000 + Math.random() * 900000).toString(); // 6-digit OTP

    // await this.twilioClient.messages.create({
    //   body: `Your verification code is: ${otpCode}`,
    //   from: this.configService.get('TWILIO_PHONE_NUMBER'),
    //   to: phoneNumber,
    // });

    // Was findOneAndUpdate(..., { upsert: true }). There is no unique index on
    // phoneNumber, so that only ever updated the FIRST match and left any
    // duplicates behind; deleting then inserting guarantees exactly one live
    // code per number, which is what the flow assumes.
    await this.prisma.otp.deleteMany({ where: { phoneNumber, type: "phone" } });
    await this.prisma.otp.create({
      data: {
        id: generateObjectId(),
        phoneNumber,
        code: otpCode,
        type: "phone",
        expiresAt: new Date(Date.now() + 5 * 60 * 1000), // 5 mins expiration
      },
    });
  }

  async sendEmailVerificationLink(email: string, lang: string = "en") {
    // Generate a token
    const token = Math.floor(100000 + Math.random() * 900000).toString();
    const expires = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24 hours

    // Upsert OTP for email verification
    await this.prisma.otp.deleteMany({
      where: { email, type: "email_verification" },
    });
    await this.prisma.otp.create({
      data: {
        id: generateObjectId(),
        email,
        code: token,
        type: "email_verification",
        expiresAt: expires,
      },
    });
    await this.emailService.sendEmail(
      email,
      'Verify your email',
      '<h1>Verify your email</h1> <p>Use this code to verify your email: <strong>' + token + '</strong></p>',
    );
    return {
      message: this.i18n.translate("auth.auth.verification_email_sent", {
        lang: this.getLang(),
      }),
    };
  }
  async verifyEmailToken(token: string) {
    console.log("Verifying email token:", token);
    // Find OTP record for email verification
    const record = await this.prisma.otp.findFirst({
      where: { code: token, type: "email_verification" },
    });
    console.log("Record", record);
    if (!record) {
      throw new UnauthorizedException(
        this.i18n.translate("auth.auth.google_verification_failed", {
          lang: this.getLang(),
        }),
      );
    }

    // Check expiration
    const isExpired =
      (record.expiresAt && record.expiresAt < new Date()) ||
      (record.createdAt &&
        new Date().getTime() - new Date(record.createdAt).getTime() >
        24 * 60 * 60 * 1000);
    if (isExpired) {
      await this.prisma.otp.deleteMany({
        where: { code: token, type: "email_verification" },
      });
      throw new UnauthorizedException(
        this.i18n.translate("auth.auth.verification_token_expired", {
          lang: this.getLang(),
        }),
      );
    }

    // Optionally, delete the token after verification
    await this.prisma.otp.deleteMany({
      where: { code: token, type: "email_verification" },
    });

    return {
      email: record.email,
      message: this.i18n.translate("auth.auth.email_verified", {
        lang: this.getLang(),
      }),
    };
  }

  async verifyOtp(phoneNumber: string, code: string) {
    const lang = this.cls.get("lang") || "en";
    const record = await this.prisma.otp.findFirst({ where: { phoneNumber } });

    if (!record) return { message: this.i18n.translate("auth.auth.otp_not_found", { lang }), data: { isValid: false } };

    // Check expiration (5 mins window)
    const isExpired =
      new Date().getTime() - new Date(record.createdAt).getTime() >
      5 * 60 * 1000;
    if (isExpired) {
      await this.prisma.otp.deleteMany({ where: { phoneNumber } }); // Delete expired OTP
      return { message: this.i18n.translate("auth.auth.otp_expired", { lang }), data: { isValid: false } };
    }

    const isValid = record.code === code;

    if (isValid) {
      await this.prisma.otp.deleteMany({ where: { phoneNumber } }); // Delete OTP after successful verification
    }

    return { message: this.i18n.translate("auth.auth.otp_verified", { lang: this.getLang() }), data: { isValid } };
  }

  async sendForgotPasswordEmail(email: string, lang: string = "en") {
    const user = await this.userService.findUserByEmail(email);
    console.log("User found for forgot password:", user);
    if (!user) {
      throw new UnauthorizedException(
        this.i18n.translate("auth.auth.email_not_found", {
          lang: this.getLang(),
        }),
      );
    }
    // Generate token
    const token = Math.floor(100000 + Math.random() * 900000).toString();
    const expires = new Date(Date.now() + 60 * 60 * 1000); // 1 hour

    // Save token and expiry to user
    await this.userService.updateUser(user.id, {
      resetPasswordToken: token,
      resetPasswordExpires: expires,
    });

    // Send email (adjust URL as needed)

    await this.emailService.sendEmail(
      user.email,
      'Reset your password',
      '<h1>Reset your password</h1> <p>Use this code to reset your password: <strong>' + token + '</strong></p>',
    );

    // await this.mailerService.sendMail({
    //   to: user.email,
    //   subject: 'Reset your password',
    //   template: './reset-password', // e.g. src/templates/reset-password.hbs
    //   context: { name: user.name, resetUrl },
    // });

    return {
      message: this.i18n.translate("auth.auth.reset_link_sent", { lang }),
    };
  }

  async verifyResetPasswordToken(token: string) {
    const user = await this.userService.findByResetToken(token);
    if (!user) {
      throw new UnauthorizedException(
        this.i18n.translate("auth.auth.invalid_reset_token", {
          lang: this.getLang(),
        }),
      );
    }

    if (user.resetPasswordExpires && user.resetPasswordExpires < new Date()) {
      throw new UnauthorizedException(
        this.i18n.translate("auth.auth.reset_token_expired", {
          lang: this.getLang(),
        }),
      );
    }

    const newPayload = {
      sub: user.id,
      email: user.email,
      roles: user.roles,
      location: toGeoJson(user.latitude, user.longitude),
      image: user.image,
      isDisabled: user.isDisabled,
    };

    const newAccessToken = this.jwtService.sign(newPayload, {
      expiresIn: "1d",
    });
    return {
      data: {
        user,
        accessToken: newAccessToken,
      },
    };
  }

  async resetPassword(token: string, newPassword: string) {
    const user = await this.verifyResetPasswordToken(token);
    const userId = String(user.data.user.id);
    await this.userService.updateUser(userId, { password: newPassword });
    // updateUser's generic sanitizer strips null values, so clearing the
    // token/expiry needs a direct write — otherwise the same code stays
    // usable again until it naturally expires.
    await this.userService.clearPasswordResetToken(userId);
    return {
      message: this.i18n.translate("auth.auth.password_reset_success", {
        lang: this.getLang(),
      }),
    };
  }

  async findOrCreateUserByEmail(payload: {
    sub: string;
    email: string;
    firstName?: string;
    lastName?: string;
    name?: string;
    // The declared shape used to be `{ accessToken, returnPayload }`, which this
    // method never returned: it spreads returnPayload's fields onto the top
    // level (see the return below), so callers get `email`, `name`,
    // `refreshToken` and `sub` directly. The old annotation hid that from every
    // caller and from the type checker.
  }): Promise<{ accessToken: string } & Record<string, any>> {
    // Check if user exists
    const user = await this.userService.findUserByEmail(payload.email);
    let returnPayload: any = {};
    if (!user) {
      // Create new user.
      //
      // NOTE: createUser returns { message, data } — it always has. The old code
      // cast that wrapper straight to UserDocument, so `newUser._id` was
      // undefined and every Google sign-up for a NEW account minted a token
      // whose `sub` claim was undefined, with { message, data } spread into the
      // payload instead of the user's own fields. Reading `.data` fixes it.
      const created = await this.userService.createUser({
        email: payload.email,
        // Add any other default fields as needed
        provider: "google", // or set based on your logic
        password: "",
        name:
          payload.firstName && payload.lastName
            ? `${payload.firstName} ${payload.lastName}`
            : payload.name
              ? payload.name
              : "",
        address: "",
        roles: ["buyer"],
        location: {
          type: "Point",
          coordinates: [0, 0], // Default coordinates, adjust as needed
        },
        image: null,
      } as never);

      const newUser = (created as { data: any }).data;

      const refreshToken = this.jwtService.sign({}, { expiresIn: "3d" });
      returnPayload = {
        ...newUser,
        sub: newUser.id,
        refreshToken,
      };
    } else {
      // Existing Google users also need a refresh token — without one, the
      // access token expiring (or any transient 401) has no recovery path
      // and silently logs the user back out to signin.
      const refreshToken = this.jwtService.sign({}, { expiresIn: "3d" });
      // toObject() is gone with Mongoose; the row is already plain, but its
      // secret columns must be removed before it goes into a signed token.
      returnPayload = {
        ...stripUserSecrets(user),
        location: toGeoJson(user.latitude, user.longitude),
        sub: user.id,
        refreshToken,
      };
    }

    const accessToken = this.jwtService.sign(returnPayload, {
      expiresIn: "1d",
    });

    return {
      accessToken,
      ...returnPayload,
    };
  }
  createJwtToken(payload: any) {
    return this.jwtService.sign(payload, {
      expiresIn: "10h",
    });
  }

  async verifyGoogleToken(idToken: string) {
    console.log(
      "Verifying Google ID token:",
      idToken,
      this.configService.get<string>("GOOGLE_CLIENT_ID"),
    );
    try {



      const ticket = await this.googleClient.verifyIdToken({
        idToken,
        audience: [
          this.configService.get<string>("GOOGLE_CLIENT_ID"),
          this.configService.get<string>("GOOGLE_CLIENT_ID_ANDROID"),
          this.configService.get<string>("GOOGLE_CLIENT_ID_IOS"),
        ].filter((value): value is string => Boolean(value)),
      });

      const payload = ticket.getPayload();

      // await new Promise((resolve) => setTimeout(resolve, 2000));
      if (!payload) {
        throw new UnauthorizedException("Invalid Google token");
      }



      const user = await this.findOrCreateUserByEmail({
        sub: payload["sub"],
        email: payload["email"] as string,
        firstName: payload["given_name"],
        lastName: payload["family_name"],
        name: payload["name"],
      });


      return { user, accessToken: user.accessToken };
    } catch (err) {
      console.error("Error verifying Google ID token:", err);
      throw new UnauthorizedException(
        this.i18n.translate("auth.auth.google_verification_failed", {
          lang: this.getLang(),
        }),
      );
    }
  }
}
