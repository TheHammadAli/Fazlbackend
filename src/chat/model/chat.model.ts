import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";
import type {
  Conversation as ConversationRow,
  Message as MessageRow,
} from "../../../generated/prisma/client";

/** Module model file — replaces schema/conversation.schema.ts and schema/message.schema.ts. */

export type Conversation = ConversationRow;
export type Message = MessageRow;

export const CONVERSATION_STATUSES = ["open", "closed"] as const;
export type ConversationStatus = (typeof CONVERSATION_STATUSES)[number];

/**
 * WhatsApp-style delivery state.
 *
 * `read` (boolean) is kept in sync with `status` — status === "read" <=>
 * read === true — so every existing unread-count query that filters on `read`
 * keeps working. `status` is the source of truth for tick rendering.
 */
export const MESSAGE_STATUSES = ["sent", "delivered", "read"] as const;
export type MessageStatus = (typeof MESSAGE_STATUSES)[number];

export class ChatParticipantModel {
  @ApiProperty()
  _id: string;

  @ApiProperty()
  id: string;

  @ApiPropertyOptional()
  name?: string | null;

  @ApiProperty()
  email: string;

  @ApiPropertyOptional()
  image?: string | null;

  @ApiPropertyOptional({ type: String, format: "date-time" })
  lastSeenAt?: Date | null;

  @ApiPropertyOptional({ description: "Live presence, stamped on from memory." })
  isOnline?: boolean;
}

export class MessageModel {
  @ApiProperty({ example: "6a8d9c1828b1818429e64faa" })
  id: string;

  @ApiProperty({ description: "Mirror of `id`, kept for existing clients." })
  _id: string;

  @ApiProperty()
  conversationId: string;

  @ApiProperty()
  sender: string;

  @ApiProperty()
  receiver: string;

  @ApiPropertyOptional()
  text?: string | null;

  @ApiPropertyOptional({
    description:
      "Per-viewer copy for system messages (offer accept/decline/expiry), where what happened reads differently for each participant. The sender's own client renders this instead of `text`.",
  })
  senderText?: string | null;

  @ApiPropertyOptional()
  imageUrl?: string | null;

  @ApiPropertyOptional()
  audioUrl?: string | null;

  @ApiPropertyOptional({ description: "Voice message length in seconds." })
  audioDuration?: number | null;

  @ApiProperty({ default: false })
  read: boolean;

  @ApiProperty({ enum: MESSAGE_STATUSES, default: "sent" })
  status: MessageStatus;

  @ApiPropertyOptional({ type: String, format: "date-time" })
  deliveredAt?: Date | null;

  @ApiPropertyOptional({ type: String, format: "date-time" })
  readAt?: Date | null;

  @ApiProperty({ type: String, format: "date-time" })
  createdAt: Date;
}

export class ConversationModel {
  @ApiProperty({ example: "6a8d9c1828b1818429e64faa" })
  id: string;

  @ApiProperty({ description: "Mirror of `id`, kept for existing clients." })
  _id: string;

  @ApiProperty({ type: ChatParticipantModel })
  buyer: ChatParticipantModel;

  @ApiProperty({ type: ChatParticipantModel })
  seller: ChatParticipantModel;

  @ApiProperty({ enum: CONVERSATION_STATUSES, default: "open" })
  status: ConversationStatus;

  @ApiPropertyOptional({ type: String, format: "date-time" })
  lastMessageAt?: Date | null;

  @ApiPropertyOptional({ description: "Newest message, for the inbox preview line." })
  latestMessage?: unknown;

  @ApiProperty({ description: "Unread messages addressed to the requesting user." })
  unreadCount: number;

  @ApiProperty({ type: String, format: "date-time" })
  createdAt: Date;

  @ApiProperty({ type: String, format: "date-time" })
  updatedAt: Date;
}
