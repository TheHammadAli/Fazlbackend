import {
  IsArray,
  IsEmail,
  IsEnum,
  IsNotEmpty,
  IsOptional,
  IsString,
  ValidateNested,
} from "class-validator";
import { Type } from "class-transformer";
import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";
import {
  ADMIN_ACTIONS,
  ADMIN_PERMISSIONS,
  AdminAction,
  AdminPermission,
} from "src/common/constants/admin-permissions.constants";

export { ADMIN_PERMISSIONS, ADMIN_ACTIONS };
export type { AdminAction, AdminPermission };

export const ADMIN_PANEL_ROLES = ["super_admin", "admin", "moderator"] as const;
export type AdminPanelRole = (typeof ADMIN_PANEL_ROLES)[number];

/** Super Admin is a single, fixed account and is never created/assigned through the admin panel. */
export const CREATABLE_ADMIN_ROLES = ["admin", "moderator"] as const;
export type CreatableAdminRole = (typeof CREATABLE_ADMIN_ROLES)[number];

export class PermissionEntryDto {
  @ApiProperty({ enum: ADMIN_PERMISSIONS, example: "shops" })
  @IsEnum(ADMIN_PERMISSIONS)
  page: AdminPermission;

  @ApiProperty({ enum: ADMIN_ACTIONS, isArray: true, example: ["view", "edit"] })
  @IsArray()
  @IsEnum(ADMIN_ACTIONS, { each: true })
  actions: AdminAction[];
}

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

  @ApiPropertyOptional({ type: [PermissionEntryDto] })
  @IsArray()
  @IsOptional()
  @ValidateNested({ each: true })
  @Type(() => PermissionEntryDto)
  permissions?: PermissionEntryDto[];
}
