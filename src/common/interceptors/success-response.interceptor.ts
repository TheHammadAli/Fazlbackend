import {
  CallHandler,
  ExecutionContext,
  Injectable,
  NestInterceptor,
} from "@nestjs/common";
import { Observable } from "rxjs";
import { map } from "rxjs/operators";
import { withLegacyIds } from "../utils/legacy-id.util";

@Injectable()
export class SuccessResponseInterceptor implements NestInterceptor {
  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    return next.handle().pipe(
      map((data) => {
        const ctx = context.switchToHttp();
        const response = ctx.getResponse();
        const request = ctx.getRequest();

        return {
          success: true,
          statusCode: response.statusCode,
          message: data?.message || "Operation successful",
          error: null, // Explicit null error field
          // Mirrors Prisma's `id` onto `_id` so responses stay byte-compatible
          // with the three clients. This is now the only thing emitting `_id`
          // anywhere in the stack — see legacy-id.util.ts.
          data: withLegacyIds(data?.data || (data?.message ? undefined : data)),
          ...(data?.meta && { meta: data.meta }),
          path: request.url,
          timestamp: new Date().toISOString(),
        };
      }),
    );
  }
}
