// auth/strategies/jwt.strategy.ts
import { Injectable } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { PassportStrategy } from "@nestjs/passport";
import { ExtractJwt, Strategy } from "passport-jwt";
import { PermissionEntry } from "src/common/constants/admin-permissions.constants";

/**
 * Which table `sub` is an id in. Staff and customers are separate tables since
 * the split, so an id alone no longer identifies a row — anything that writes a
 * foreign key from the token (the activity log's actor, most notably) needs to
 * know which one it is.
 *
 * Optional so tokens issued before the split still validate; absent means
 * "user", which is what every pre-split customer token was.
 */
export type PrincipalType = "user" | "admin" | "member";

export interface JwtPayload {
  sub: string;
  email: string;
  roles: string[];
  principal?: PrincipalType;
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

          // Extract token from Authorization header
          const authHeader = req.headers.authorization;
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
    return {
      sub: payload.sub,
      email: payload.email,
      roles: payload.roles,
      principal: payload.principal ?? "user",
      permissions: payload.permissions,
      location: payload.location,
      image: payload.image,
    };
  }
}
