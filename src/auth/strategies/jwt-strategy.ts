// auth/strategies/jwt.strategy.ts
import { Injectable } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { PassportStrategy } from "@nestjs/passport";
import { ExtractJwt, Strategy } from "passport-jwt";
import { PermissionEntry } from "src/common/constants/admin-permissions.constants";

export interface JwtPayload {
  sub: string;
  email: string;
  roles: string[];
  permissions?: PermissionEntry[];
  location: Location;
  image: string | null;
}
@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor(configService: ConfigService) {
    super({
      jwtFromRequest: ExtractJwt.fromExtractors([
        (req: any) => {
          // ✅ Log headers here
          console.log("Request headers:", req.headers);

          // Extract token from Authorization header
          const authHeader = req.headers.authorization;
          console.log("step-2", authHeader);
          if (authHeader?.startsWith("Bearer ")) {
            return authHeader.split(" ")[1];
          }
          return null;
        },
      ]),
      ignoreExpiration: false,
      secretOrKey: configService.getOrThrow("JWT_SECRET"),
    });
  }

  async validate(payload: JwtPayload) {
    console.log("JWT Payload:", payload);
    return {
      sub: payload.sub,
      email: payload.email,
      roles: payload.roles,
      permissions: payload.permissions,
      location: payload.location,
      image: payload.image,
    };
  }
}
