import { NestInterceptor, ExecutionContext, CallHandler } from '@nestjs/common';
import { ClsService } from 'nestjs-cls';
export declare class LanguageInterceptor implements NestInterceptor {
    private readonly cls;
    constructor(cls: ClsService);
    intercept(context: ExecutionContext, next: CallHandler): import("rxjs").Observable<any>;
}
