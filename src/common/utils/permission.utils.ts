import { ForbiddenException } from "@nestjs/common";

type CallerClaims = {
  sub: string;
  roles?: string[];
  permissions?: string[];
};

/** Allows a caller acting on their own resource unconditionally (regular self-service);
 *  otherwise requires super_admin or the given granted permission. */
export function assertOwnerOrPermission(
  currentUser: CallerClaims,
  targetId: string,
  permission: string,
): void {
  if (currentUser.sub === targetId) return;
  if (currentUser.roles?.includes("super_admin")) return;
  if (currentUser.permissions?.includes(permission)) return;

  throw new ForbiddenException("You do not have permission to perform this action");
}
