import { ApiProperty } from "@nestjs/swagger";
import { IsNotEmpty, IsEnum, IsMongoId } from "class-validator";

export class CreateShareDto {
  @ApiProperty({
    example: "507f1f77bcf86cd799439011",
    description: "ID of the item being shared",
  })
  @IsNotEmpty()
  @IsMongoId()
  itemId: string;

  @ApiProperty({
    enum: ["product", "service"],
    description: "Type of item being shared",
  })
  @IsNotEmpty()
  @IsEnum(["product", "service"])
  itemType: "product" | "service";
}
