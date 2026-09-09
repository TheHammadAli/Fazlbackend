/**
 * Every section a super admin can grant an admin access to.
 *
 * This list is the authority: `sanitizePermissions` rejects anything absent
 * from it, so a page the admin panel offers but this omits cannot be granted at
 * all — the whole save fails with "Invalid permission page". Keep it in step
 * with PermissionsPicker in the panel and the AdminPermissionPage enum.
 */
export const ADMIN_PERMISSIONS = [
  "users",
  "shops",
  "listings",
  "services",
  "categories",
  "bookings",
  "broadcasts",
  "announcements",
  "feed",
  "reports",
  "email-logs",
  "analytics",
  "settings",
  "members",
  "wallet",
  "reviews",
] as const;
export type AdminPermission = (typeof ADMIN_PERMISSIONS)[number];

export const ADMIN_ACTIONS = ["view", "edit", "delete"] as const;
export type AdminAction = (typeof ADMIN_ACTIONS)[number];

export type PermissionEntry = {
  page: AdminPermission;
  actions: AdminAction[];
};
