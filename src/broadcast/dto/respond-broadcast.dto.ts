import { ApiProperty } from "@nestjs/swagger";
import { IsNotEmpty, IsString } from "class-validator";

export class RespondBroadcastDto {
  @ApiProperty({ example: "66b1a2c3d4e5f67890123456" })
  @IsString()
  @IsNotEmpty()
  broadcastId: string;

  @ApiProperty({ example: "66c1a2c3d4e5f67890123456 (sellerId)" })
  @IsString()
  @IsNotEmpty()
  sellerId: string;

  @ApiProperty({ example: "I can supply at best price within 2 hours" })
  @IsString()
  @IsNotEmpty()
  message: string;
}
