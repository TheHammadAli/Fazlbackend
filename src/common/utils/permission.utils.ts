import { ForbiddenException } from "@nestjs/common";
import { AdminAction, PermissionEntry } from "src/common/constants/admin-permissions.constants";

type CallerClaims = {
  sub: string;
  roles?: string[];
  permissions?: PermissionEntry[];
};

/** Allows a caller acting on their own resource unconditionally (regular self-service);
 *  otherwise requires super_admin, or the given permission's page to include the given action. */
export function assertOwnerOrPermission(
  currentUser: CallerClaims,
  targetId: string,
  page: string,
  action: Exclude<AdminAction, "view">,
): void {
  if (currentUser.sub === targetId) return;
  if (currentUser.roles?.includes("super_admin")) return;

  const entry = currentUser.permissions?.find((p) => p.page === page);
  if (entry?.actions?.includes(action)) return;

  throw new ForbiddenException("You do not have permission to perform this action");
}
