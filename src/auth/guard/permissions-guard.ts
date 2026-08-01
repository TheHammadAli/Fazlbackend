import { Injectable, CanActivate, ExecutionContext, ForbiddenException } from "@nestjs/common";
import { Reflector } from "@nestjs/core";
import { REQUIRE_PERMISSION_KEY } from "src/common/decorators/require-permission.decorator";

@Injectable()
export class PermissionsGuard implements CanActivate {
  constructor(private reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const requiredPermission = this.reflector.getAllAndOverride<string>(REQUIRE_PERMISSION_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);

    if (!requiredPermission) {
      return true;
    }

    const request = context.switchToHttp().getRequest();
    const userRoles: string[] = request.user?.roles ?? [];
    const userPermissions: string[] = request.user?.permissions ?? [];

    if (userRoles.includes("super_admin")) {
      return true;
    }

    if (!userPermissions.includes(requiredPermission)) {
      throw new ForbiddenException("You do not have permission to access this section");
    }

    return true;
  }
}
