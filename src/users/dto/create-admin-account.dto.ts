import { IsArray, IsEmail, IsEnum, IsNotEmpty, IsOptional, IsString } from "class-validator";
import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";

export const ADMIN_PANEL_ROLES = ["super_admin", "admin", "moderator"] as const;
export type AdminPanelRole = (typeof ADMIN_PANEL_ROLES)[number];

/** Super Admin is a single, fixed account and is never created/assigned through the admin panel. */
export const CREATABLE_ADMIN_ROLES = ["admin", "moderator"] as const;
export type CreatableAdminRole = (typeof CREATABLE_ADMIN_ROLES)[number];

export const ADMIN_PERMISSIONS = [
  "users",
  "shops",
  "listings",
  "services",
  "categories",
  "bookings",
  "broadcasts",
  "feed",
  "reports",
  "email-logs",
  "settings",
] as const;
export type AdminPermission = (typeof ADMIN_PERMISSIONS)[number];

export class CreateAdminAccountDto {
  @ApiProperty({ example: "Ayesha Khan" })
  @IsString()
  @IsNotEmpty()
  name: string;

  @ApiProperty({ example: "ayesha@fazl.com" })
  @IsEmail()
  email: string;

  @ApiProperty({ enum: CREATABLE_ADMIN_ROLES, example: "admin" })
  @IsEnum(CREATABLE_ADMIN_ROLES)
  role: CreatableAdminRole;

  @ApiPropertyOptional({ enum: ADMIN_PERMISSIONS, isArray: true, example: ["shops"] })
  @IsArray()
  @IsOptional()
  @IsEnum(ADMIN_PERMISSIONS, { each: true })
  permissions?: AdminPermission[];
}
