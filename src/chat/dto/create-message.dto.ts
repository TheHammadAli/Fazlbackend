import { ApiProperty } from "@nestjs/swagger";

export class CreateMessageDto {
  @ApiProperty({ example: "665f6d9a3ef12a0c4c122d23" })
  conversationId: string;

  @ApiProperty({ example: "6645f1d8a8c02c2b8f5a9df2" })
  senderId: string;

  @ApiProperty({ example: "6645f1d8a8c02c2b8f5a9df3" })
  receiverId: string;

  @ApiProperty({ example: "Hello! Is this still available?" })
  text: string;
}
