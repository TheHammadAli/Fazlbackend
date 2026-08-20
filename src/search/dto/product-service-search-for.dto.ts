import { ApiPropertyOptional } from "@nestjs/swagger";

export class SearchAllProductsServiceDto {
  @ApiPropertyOptional({
    description: "Product name to search for",
    example: "iPhone",
  })
  name?: string;

  @ApiPropertyOptional({
    description: "Category of the product",
    example: "electronics",
  })
  category?: string;

  @ApiPropertyOptional({
    description: "Page number for pagination",
    example: 1,
  })
  page?: number;

  @ApiPropertyOptional({
    description: "Number of results per page",
    example: 20,
  })
  limit?: number;

  @ApiPropertyOptional({ example: "2026-01-01" })
  startDate?: string;

  @ApiPropertyOptional({ example: "2026-01-31" })
  endDate?: string;
}
