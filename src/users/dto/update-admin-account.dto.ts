import { IsArray, IsEmail, IsEnum, IsOptional, IsString } from "class-validator";
import { ApiPropertyOptional } from "@nestjs/swagger";
import {
  ADMIN_PERMISSIONS,
  AdminPermission,
  CREATABLE_ADMIN_ROLES,
  CreatableAdminRole,
} from "./create-admin-account.dto";

export class UpdateAdminAccountDto {
  @ApiPropertyOptional({ example: "Ayesha Khan" })
  @IsString()
  @IsOptional()
  name?: string;

  @ApiPropertyOptional({ example: "ayesha@fazl.com" })
  @IsEmail()
  @IsOptional()
  email?: string;

  @ApiPropertyOptional({ enum: CREATABLE_ADMIN_ROLES, example: "admin" })
  @IsEnum(CREATABLE_ADMIN_ROLES)
  @IsOptional()
  role?: CreatableAdminRole;

  @ApiPropertyOptional({ enum: ADMIN_PERMISSIONS, isArray: true, example: ["shops"] })
  @IsArray()
  @IsOptional()
  @IsEnum(ADMIN_PERMISSIONS, { each: true })
  permissions?: AdminPermission[];
}
