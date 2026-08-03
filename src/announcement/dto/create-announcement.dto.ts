import { IsNotEmpty, IsString } from "class-validator";
import { ApiProperty } from "@nestjs/swagger";

export class CreateAnnouncementDto {
  @ApiProperty({ example: "New feature: Echo Broadcasts" })
  @IsString()
  @IsNotEmpty()
  title: string;

  @ApiProperty({ example: "You can now message nearby sellers directly from the app!" })
  @IsString()
  @IsNotEmpty()
  message: string;
}
