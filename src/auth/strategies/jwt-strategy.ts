// auth/strategies/jwt.strategy.ts
import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';

export interface JwtPayload {
  sub: string;
  email: string;
  roles: string[];
  location: Location;
}
@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor(configService: ConfigService) {
    super({
      jwtFromRequest: ExtractJwt.fromExtractors([
        (req: any) => {
          // ✅ Log headers here
          console.log('Request headers:', req.headers);

          // Extract token from Authorization header
          const authHeader = req.headers.authorization;
          console.log('step-2', authHeader);
          if (authHeader?.startsWith('Bearer ')) {
            return authHeader.split(' ')[1];
          }
          return null;
        },
      ]),
      ignoreExpiration: false,
      secretOrKey: configService.getOrThrow('JWT_SECRET'),
    });
  }

  async validate(payload: JwtPayload) {
    return {
      sub: payload.sub,
      email: payload.email,
      roles: payload.roles,
      location: payload.location,
    };
  }
}
