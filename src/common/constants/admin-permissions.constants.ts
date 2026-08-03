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
  "settings",
  "members",
] as const;
export type AdminPermission = (typeof ADMIN_PERMISSIONS)[number];

export const ADMIN_ACTIONS = ["view", "edit", "delete"] as const;
export type AdminAction = (typeof ADMIN_ACTIONS)[number];

export type PermissionEntry = {
  page: AdminPermission;
  actions: AdminAction[];
};
