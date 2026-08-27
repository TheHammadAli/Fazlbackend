// auth/dto/login.dto.ts
import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";
import { IsEmail, IsIn, IsNotEmpty, IsOptional, IsString } from "class-validator";

export class LoginDto {
  @ApiProperty({
    example: "user@example.com",
    description: "User email address",
  })
  @IsEmail({}, { message: "Email must be a valid email address" })
  email: string;

  @ApiProperty({ example: "your password", description: "User password" })
  @IsString()
  @IsNotEmpty({ message: "Password must not be empty" })
  password: string;

  @ApiPropertyOptional({
    enum: ["web", "admin"],
    example: "web",
    description:
      "Which app the login came from. A member who was promoted from an existing account has a separate admin-panel password — 'admin' checks that one, 'web' (default) checks the account's original password.",
  })
  @IsOptional()
  @IsIn(["web", "admin"])
  loginContext?: "web" | "admin";
}
