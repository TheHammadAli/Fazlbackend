import { ApiPropertyOptional } from "@nestjs/swagger";

export class PaginationDto {
  @ApiPropertyOptional({ example: 1 })
  page?: number;

  @ApiPropertyOptional({ example: 10 })
  limit?: number;

  @ApiPropertyOptional({ example: "name" })
  search?: string;

  @ApiPropertyOptional({ example: "2026-01-01" })
  startDate?: string;

  @ApiPropertyOptional({ example: "2026-01-31" })
  endDate?: string;
}
