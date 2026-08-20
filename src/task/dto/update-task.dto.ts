import { ApiPropertyOptional } from "@nestjs/swagger";
import {
  IsArray,
  IsDateString,
  IsEnum,
  IsMongoId,
  IsOptional,
  IsString,
} from "class-validator";
import { TASK_PRIORITIES, TASK_STATUSES, TaskPriority, TaskStatus } from "../schema/task.schema";

export class UpdateTaskDto {
  @ApiPropertyOptional({ example: "Follow up on pending shop approvals" })
  @IsString()
  @IsOptional()
  title?: string;

  @ApiPropertyOptional({ example: "Review and approve/reject shops submitted this week" })
  @IsString()
  @IsOptional()
  description?: string;

  @ApiPropertyOptional({ type: [String], example: ["64f0c8f5b1a2c3d4e5f6a7b8"] })
  @IsArray()
  @IsOptional()
  @IsMongoId({ each: true })
  assignees?: string[];

  @ApiPropertyOptional({ enum: TASK_PRIORITIES, example: "high" })
  @IsEnum(TASK_PRIORITIES)
  @IsOptional()
  priority?: TaskPriority;

  @ApiPropertyOptional({ enum: TASK_STATUSES, example: "in_progress" })
  @IsEnum(TASK_STATUSES)
  @IsOptional()
  status?: TaskStatus;

  @ApiPropertyOptional({ example: "2026-08-15" })
  @IsDateString()
  @IsOptional()
  dueDate?: string;
}
