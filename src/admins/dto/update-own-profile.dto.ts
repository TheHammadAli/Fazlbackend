import { ApiPropertyOptional } from "@nestjs/swagger";
import { IsOptional, IsString } from "class-validator";

/**
 * What a staff member may change about themselves.
 *
 * Name, email and role are deliberately absent: those are set by whoever
 * created the account and are changed through Admin Management, so an admin
 * cannot rename themselves out of an audit trail or take a role they were not
 * granted.
 */
export class UpdateOwnProfileDto {
  @ApiPropertyOptional({ example: "+923001234567" })
  @IsString()
  @IsOptional()
  phone?: string;

  @ApiPropertyOptional({ example: "Gulberg III, Lahore" })
  @IsString()
  @IsOptional()
  address?: string;
}
