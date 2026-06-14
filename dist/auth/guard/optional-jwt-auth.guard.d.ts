import { ExecutionContext } from "@nestjs/common";
declare const OptionalJwtAuthGuard_base: import("@nestjs/passport").Type<import("@nestjs/passport").IAuthGuard>;
export declare class OptionalJwtAuthGuard extends OptionalJwtAuthGuard_base {
    handleRequest(err: unknown, user: unknown, info: unknown, context: ExecutionContext, status?: unknown): unknown;
}
export {};
