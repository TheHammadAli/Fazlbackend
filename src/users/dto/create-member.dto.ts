import { ApiProperty } from "@nestjs/swagger";
import { IsEmail, IsNotEmpty, IsString } from "class-validator";

export class CreateMemberDto {
  @ApiProperty({ example: "Bilal Ahmed" })
  @IsString()
  @IsNotEmpty()
  name: string;

  @ApiProperty({ example: "bilal@fazl.com" })
  @IsEmail()
  email: string;
}
