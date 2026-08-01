import { Exclude, Expose } from "class-transformer";
import { ApiProperty } from "@nestjs/swagger";
import { Location } from "../schema/users.interfaces";

@Exclude()
export class UserResponseDto {
  @ApiProperty({ example: "507f1f77bcf86cd799439011" })
  @Expose()
  id: string;

  @ApiProperty({ example: "John Doe" })
  @Expose()
  name: string;

  @ApiProperty({ example: "user@example.com" })
  @Expose()
  email: string;

  @ApiProperty({
    example: ["buyer"],
    isArray: true,
    enum: ["buyer", "seller", "admin", "subadmin"],
  })
  @Expose()
  role: string[];

  @ApiProperty({
    example: { type: "Point", coordinates: [73.0479, 33.6844] },
  })
  @Expose()
  location: Location;

  @ApiProperty()
  @Expose()
  createdAt: Date;

  @ApiProperty()
  @Expose()
  updatedAt: Date;
}
