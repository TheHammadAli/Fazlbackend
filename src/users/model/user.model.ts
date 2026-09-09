import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";
import type { User as UserRow } from "../../../generated/prisma/client";

/** Module model file — replaces schema/users.schema.ts. */

export type User = UserRow;

/**
 * Customer roles only. Staff roles left this list when admins and members were
 * split into their own tables — see src/admins/. Every role here is now
 * self-assignable, so SELF_ASSIGNABLE_ROLES is the same set.
 */
export const USER_ROLES = ["buyer", "seller"] as const;
export type UserRole = (typeof USER_ROLES)[number];

/** Roles a user may assign to themselves through the self-service update endpoint. */
export const SELF_ASSIGNABLE_ROLES = USER_ROLES;

/**
 * Columns that must never reach a client.
 *
 * Mongoose marked these `select: false`, which silently kept them out of every
 * query result. Prisma returns every scalar by default, so that protection has
 * to be explicit — see `userPublicSelect` in ../user-select.ts, which every read
 * path returning a user is required to use.
 */
export const USER_SECRET_FIELDS = [
  "password",
  "refreshToken",
  "resetPasswordToken",
  "resetPasswordExpires",
  "provider",
] as const;

/**
 * Strips the secret columns from a row.
 *
 * Replaces the `UserSchema.methods.toJSON` override, which deleted `password`
 * on serialisation. Used where a full row had to be read (login, password
 * reset) but the result is still returned to a caller.
 */
export function stripUserSecrets<T extends Record<string, any>>(
  user: T,
): Omit<T, (typeof USER_SECRET_FIELDS)[number]> {
  const clean = { ...user };
  for (const field of USER_SECRET_FIELDS) {
    delete (clean as Record<string, unknown>)[field];
  }
  return clean;
}

export class UserModel {
  @ApiProperty({ example: "6a8d9c1828b1818429e64faa" })
  id: string;

  @ApiProperty({ description: "Mirror of `id`, kept for existing clients." })
  _id: string;

  @ApiPropertyOptional({ example: "USR-000135" })
  userCode?: string | null;

  @ApiPropertyOptional()
  name?: string | null;

  @ApiProperty({ example: "buyer@example.com" })
  email: string;

  @ApiProperty({ enum: USER_ROLES, isArray: true, default: ["buyer"] })
  roles: UserRole[];

  @ApiPropertyOptional()
  phone?: string | null;

  @ApiPropertyOptional({
    description: "GeoJSON Point. Stored as latitude/longitude columns and converted on read.",
    example: { type: "Point", coordinates: [67.0011, 24.8607] },
  })
  location?: { type: "Point"; coordinates: [number, number] } | null;

  @ApiPropertyOptional({ default: "default-avatar.png" })
  image?: string | null;

  @ApiPropertyOptional()
  address?: string | null;

  @ApiPropertyOptional({ description: "Legacy single-device push token." })
  fcmToken?: string | null;

  @ApiProperty({ type: [String], description: "One entry per signed-in device." })
  fcmTokens: string[];

  @ApiProperty({ default: false })
  isDisabled: boolean;

  @ApiPropertyOptional({ type: String, format: "date-time" })
  lastSeenAt?: Date | null;

  @ApiPropertyOptional({ description: "Live presence, from the in-memory presence service." })
  isOnline?: boolean;

  @ApiProperty({ type: String, format: "date-time" })
  createdAt: Date;

  @ApiProperty({ type: String, format: "date-time" })
  updatedAt: Date;
}
