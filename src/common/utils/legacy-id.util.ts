/**
 * Mongoose documents serialised with `_id`; Prisma rows have `id`. All three
 * clients read `_id` in 807 places across 168 files, and the React Native app
 * ships on a store-review cycle, so they cannot all be updated on cutover day.
 *
 * This walks an outgoing response and mirrors `id` onto `_id` wherever `_id` is
 * absent, so the API stays byte-compatible with what the clients already parse.
 *
 * Load-bearing: with Mongoose gone, nothing else in the stack emits `_id`.
 * Removing this breaks every client at once. It comes out only once all three
 * have shipped a release that reads `id`.
 */

/** Values that must be returned untouched rather than walked into. */
function isAtomic(value: unknown): boolean {
  return (
    value === null ||
    typeof value !== "object" ||
    value instanceof Date ||
    value instanceof RegExp ||
    Buffer.isBuffer(value)
  );
}

export function withLegacyIds<T>(payload: T): T {
  // A response is a tree, but a service could hand back a shared sub-object in
  // two places; `seen` keeps that from being walked (or mutated) twice.
  const seen = new WeakSet<object>();

  const walk = (value: unknown): unknown => {
    if (isAtomic(value)) return value;

    const obj = value as object;
    if (seen.has(obj)) return value;
    seen.add(obj);

    if (Array.isArray(value)) {
      for (const item of value) walk(item);
      return value;
    }

    const record = value as Record<string, unknown>;

    if (
      typeof record.id === "string" &&
      !Object.prototype.hasOwnProperty.call(record, "_id")
    ) {
      record._id = record.id;
    }

    for (const key of Object.keys(record)) {
      if (key === "_id") continue;
      walk(record[key]);
    }

    return value;
  };

  walk(payload);
  return payload;
}
