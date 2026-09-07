import { randomBytes } from "node:crypto";

/**
 * Generates MongoDB-shaped ObjectId hex strings for rows created after the
 * PostgreSQL migration.
 *
 * The migration preserves every existing `_id` as the primary key, so new rows
 * must keep the same 24-character hex shape. Three things in the codebase
 * depend on it:
 *
 *   - `Types.ObjectId.isValid(id)` guards sit in query paths (reports.service.ts
 *     among others) and would 404 a valid record whose id were a UUID.
 *   - S3 object keys embed entity ids, and deletion works by key prefix.
 *   - All three clients treat ids as opaque 24-char strings.
 *
 * Implemented here rather than via mongoose/bson so it outlives the removal of
 * Mongoose. Same layout as a real ObjectId: 4-byte big-endian seconds since the
 * epoch, 5 random bytes fixed per process, then a 3-byte counter.
 */

/** Fixed for the lifetime of the process, as in the ObjectId spec. */
const PROCESS_RANDOM = randomBytes(5);

/** Starts somewhere random so two processes starting in the same second do not
 *  march through the same sequence. */
let counter = randomBytes(3).readUIntBE(0, 3);

export function generateObjectId(): string {
  const buf = Buffer.allocUnsafe(12);

  buf.writeUInt32BE(Math.floor(Date.now() / 1000), 0);
  PROCESS_RANDOM.copy(buf, 4);

  counter = (counter + 1) % 0xffffff;
  buf.writeUIntBE(counter, 9, 3);

  return buf.toString("hex");
}

/** True for a well-formed 24-character lowercase-or-uppercase hex id. */
export function isObjectIdLike(value: unknown): value is string {
  return typeof value === "string" && /^[0-9a-fA-F]{24}$/.test(value);
}
