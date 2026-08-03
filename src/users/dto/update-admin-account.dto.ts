import { IsArray, IsEmail, IsEnum, IsOptional, IsString, ValidateNested } from "class-validator";
import { Type } from "class-transformer";
import { ApiPropertyOptional } from "@nestjs/swagger";
import {
  CREATABLE_ADMIN_ROLES,
  CreatableAdminRole,
  PermissionEntryDto,
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

  @ApiPropertyOptional({ type: [PermissionEntryDto] })
  @IsArray()
  @IsOptional()
  @ValidateNested({ each: true })
  @Type(() => PermissionEntryDto)
  permissions?: PermissionEntryDto[];
}
