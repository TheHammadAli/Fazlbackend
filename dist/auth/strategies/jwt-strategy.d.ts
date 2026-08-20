import { ConfigService } from "@nestjs/config";
import { Strategy } from "passport-jwt";
import { PermissionEntry } from "src/common/constants/admin-permissions.constants";
export interface JwtPayload {
    sub: string;
    email: string;
    roles: string[];
    permissions?: PermissionEntry[];
    location: Location;
    image: string | null;
}
declare const JwtStrategy_base: new (...args: [opt: import("passport-jwt").StrategyOptionsWithRequest] | [opt: import("passport-jwt").StrategyOptionsWithoutRequest]) => Strategy & {
    validate(...args: any[]): unknown;
};
export declare class JwtStrategy extends JwtStrategy_base {
    constructor(configService: ConfigService);
    validate(payload: JwtPayload): Promise<{
        sub: string;
        email: string;
        roles: string[];
        permissions: PermissionEntry[] | undefined;
        location: Location;
        image: string | null;
    }>;
}
export {};
