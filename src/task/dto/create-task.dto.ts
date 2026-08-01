import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";
import {
  ArrayNotEmpty,
  IsArray,
  IsDateString,
  IsEnum,
  IsMongoId,
  IsNotEmpty,
  IsOptional,
  IsString,
} from "class-validator";
import { TASK_PRIORITIES, TaskPriority } from "../schema/task.schema";

export class CreateTaskDto {
  @ApiProperty({ example: "Follow up on pending shop approvals" })
  @IsString()
  @IsNotEmpty()
  title: string;

  @ApiPropertyOptional({ example: "Review and approve/reject shops submitted this week" })
  @IsString()
  @IsOptional()
  description?: string;

  @ApiProperty({
    type: [String],
    example: ["64f0c8f5b1a2c3d4e5f6a7b8"],
    description: "Members this task is assigned to",
  })
  @IsArray()
  @ArrayNotEmpty()
  @IsMongoId({ each: true })
  assignees: string[];

  @ApiPropertyOptional({ enum: TASK_PRIORITIES, example: "medium" })
  @IsEnum(TASK_PRIORITIES)
  @IsOptional()
  priority?: TaskPriority;

  @ApiPropertyOptional({ example: "2026-08-15" })
  @IsDateString()
  @IsOptional()
  dueDate?: string;
}
