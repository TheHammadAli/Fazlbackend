import { Injectable } from "@nestjs/common";
import { PassportStrategy } from "@nestjs/passport";
import { Strategy, VerifyCallback } from "passport-google-oauth20";
import { ConfigService } from "@nestjs/config";

@Injectable()
export class GoogleStrategy extends PassportStrategy(Strategy, "google") {
  constructor(private configService: ConfigService) {
    super({
      clientID: configService.getOrThrow("GOOGLE_CLIENT_ID"),
      clientSecret: configService.getOrThrow("GOOGLE_CLIENT_SECRET"),
      callbackURL: configService.getOrThrow("GOOGLE_CALLBACK_URL"),
      scope: ["email", "profile"],
      passReqToCallback: true, // ✅ required for StrategyOptionsWithRequest
    });
  }

  /**
   * Extra query parameters added to the Google authorization URL.
   *
   * `select_account` forces the account chooser. Without it Google silently
   * reuses whichever session is already signed in to the browser, so a user
   * with more than one account never gets to pick which one to continue with.
   */
  authorizationParams(): Record<string, string> {
    return { prompt: "select_account" };
  }

  async validate(
    req: any,
    accessToken: string,
    refreshToken: string,
    profile: any,
    done: VerifyCallback,
  ): Promise<any> {
    const { name, emails, photos } = profile;
    const user = {
      email: emails[0].value,
      firstName: name.givenName,
      lastName: name.familyName,
      picture: photos[0].value,
      accessToken,
      refreshToken,
      provider: "google",
    };
    done(null, user);
  }
}
