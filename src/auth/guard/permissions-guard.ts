import { Injectable, CanActivate, ExecutionContext, ForbiddenException } from "@nestjs/common";
import { Reflector } from "@nestjs/core";
import { REQUIRE_PERMISSION_KEY } from "src/common/decorators/require-permission.decorator";
import { REQUIRE_ACTION_KEY } from "src/common/decorators/require-action.decorator";
import { AdminAction, PermissionEntry } from "src/common/constants/admin-permissions.constants";

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

    const requiredAction = this.reflector.getAllAndOverride<AdminAction>(REQUIRE_ACTION_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);

    const request = context.switchToHttp().getRequest();
    const userRoles: string[] = request.user?.roles ?? [];
    const userPermissions: PermissionEntry[] = request.user?.permissions ?? [];

    if (userRoles.includes("super_admin")) {
      return true;
    }

    const entry = userPermissions.find((p) => p.page === requiredPermission);
    if (!entry) {
      throw new ForbiddenException("You do not have permission to access this section");
    }

    if (requiredAction && !entry.actions?.includes(requiredAction)) {
      throw new ForbiddenException("You do not have permission to perform this action");
    }

    return true;
  }
}
