import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";
import type {
  Broadcast as BroadcastRow,
  BroadcastThread as BroadcastThreadRow,
  BroadcastMessage as BroadcastMessageRow,
  BroadcastOffer as BroadcastOfferRow,
} from "../../../generated/prisma/client";

/**
 * Module model file — replaces schema/broadcast.schema.ts,
 * broadcast-thread.schema.ts, broadcast-message.schema.ts and
 * broadcast-offer.schema.ts.
 */

export type Broadcast = BroadcastRow;
export type BroadcastThread = BroadcastThreadRow;
export type BroadcastMessage = BroadcastMessageRow;
export type BroadcastOffer = BroadcastOfferRow;

export const BROADCAST_PURPOSES = ["Buying", "Selling"] as const;
export type BroadcastPurpose = (typeof BROADCAST_PURPOSES)[number];

export const BROADCAST_STATUSES = ["open", "closed"] as const;
export type BroadcastStatus = (typeof BROADCAST_STATUSES)[number];

export const BROADCAST_TYPES = ["product", "service"] as const;
export type BroadcastType = (typeof BROADCAST_TYPES)[number];

export const BROADCAST_OFFER_STATUSES = ["pending", "accepted", "declined"] as const;
export type BroadcastOfferStatus = (typeof BROADCAST_OFFER_STATUSES)[number];

/** Default body used for the message that opens every thread of a broadcast. */
export const DEFAULT_BROADCAST_MESSAGE = "📢 New broadcast request";

export class BroadcastParticipantModel {
  @ApiProperty()
  _id: string;

  @ApiProperty()
  id: string;

  @ApiPropertyOptional()
  name?: string | null;

  @ApiPropertyOptional()
  image?: string | null;
}

export class BroadcastModel {
  @ApiProperty({ example: "6a8d9c1828b1818429e64faa" })
  id: string;

  @ApiProperty({ description: "Mirror of `id`, kept for existing clients." })
  _id: string;

  @ApiPropertyOptional({ example: "ECH-000001" })
  broadcastCode?: string | null;

  @ApiProperty({ description: "Buyer id, or the populated buyer." })
  buyer: unknown;

  @ApiProperty()
  message: string;

  @ApiPropertyOptional()
  address?: string | null;

  @ApiProperty({ enum: BROADCAST_PURPOSES })
  purpose: BroadcastPurpose;

  @ApiPropertyOptional({ description: "Category id, or the populated category." })
  category?: unknown;

  @ApiProperty({ example: 10, description: "Search radius in kilometres." })
  radius: number;

  @ApiPropertyOptional({
    description: "GeoJSON Point. Stored as latitude/longitude and converted on read.",
    example: { type: "Point", coordinates: [67.0011, 24.8607] },
  })
  location?: { type: "Point"; coordinates: [number, number] } | null;

  @ApiProperty({ enum: BROADCAST_TYPES })
  type: BroadcastType;

  @ApiPropertyOptional({ type: String, format: "date-time" })
  expiresAt?: Date | null;

  @ApiPropertyOptional({ type: String, format: "date-time" })
  lastResponseAt?: Date | null;

  @ApiProperty({ enum: BROADCAST_STATUSES, default: "open" })
  status: BroadcastStatus;

  @ApiProperty({ default: false })
  isDeleted: boolean;

  @ApiPropertyOptional({ description: "Threads opened for this broadcast." })
  threadCount?: number;

  @ApiPropertyOptional({ description: "Unread messages addressed to the requesting user." })
  unreadCount?: number;

  @ApiProperty({ type: String, format: "date-time" })
  createdAt: Date;

  @ApiProperty({ type: String, format: "date-time" })
  updatedAt: Date;
}

export class BroadcastMessageModel {
  @ApiProperty({ example: "6a8d9c1828b1818429e64faa" })
  id: string;

  @ApiProperty({ description: "Mirror of `id`, kept for existing clients." })
  _id: string;

  @ApiProperty()
  broadcast: string;

  @ApiProperty()
  thread: string;

  @ApiProperty()
  sender: unknown;

  @ApiProperty()
  receiver: unknown;

  @ApiPropertyOptional()
  message?: string | null;

  @ApiProperty({ type: [String] })
  imageUrls: string[];

  @ApiPropertyOptional()
  audioUrl?: string | null;

  @ApiPropertyOptional({ description: "Voice message length in seconds." })
  audioDuration?: number | null;

  @ApiProperty({ default: false })
  isRead: boolean;

  @ApiProperty({ type: String, format: "date-time" })
  createdAt: Date;
}

export class BroadcastThreadModel {
  @ApiProperty({ example: "6a8d9c1828b1818429e64faa" })
  id: string;

  @ApiProperty({ description: "Mirror of `id`, kept for existing clients." })
  _id: string;

  @ApiProperty()
  broadcast: string;

  @ApiProperty({ type: BroadcastParticipantModel })
  buyer: BroadcastParticipantModel;

  @ApiProperty({ type: BroadcastParticipantModel })
  seller: BroadcastParticipantModel;

  @ApiPropertyOptional({ type: String, format: "date-time" })
  lastMessageAt?: Date | null;

  @ApiPropertyOptional({ description: "Newest message, for the thread list preview." })
  latestMessage?: unknown;

  @ApiProperty()
  unreadCount: number;

  @ApiPropertyOptional({
    description:
      "This thread's offer. Real chat stays locked until the broadcast creator accepts it.",
  })
  offer?: unknown;

  @ApiProperty({ type: String, format: "date-time" })
  createdAt: Date;

  @ApiProperty({ type: String, format: "date-time" })
  updatedAt: Date;
}
