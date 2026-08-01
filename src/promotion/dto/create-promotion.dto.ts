import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";

export class CreatePromotionDto {
  @ApiProperty({ type: String, description: "Subscription ID" })
  subscriptionId: string;

  @ApiProperty({ enum: ["Product", "Shop"], description: "Target type" })
  targetType: "Product" | "Shop";

  @ApiProperty({ type: String, description: "Target ID (Product or Shop)" })
  targetId: string;

  @ApiProperty({ type: String, format: "date-time" })
  startDate: Date;

  @ApiProperty({ type: String, format: "date-time" })
  endDate: Date;

  @ApiPropertyOptional({
    enum: ["active", "expired", "cancelled", "scheduled"],
    default: "active",
  })
  status?: "active" | "expired" | "cancelled" | "scheduled";

  @ApiPropertyOptional({ default: false })
  isAutoRenew?: boolean;
}
