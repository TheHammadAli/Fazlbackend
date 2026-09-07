/**
 * Coerces `page`/`limit` into the real integers Prisma requires.
 *
 * Query-string values always arrive as strings — `?limit=10` is `"10"`, not
 * `10` — and this app registers no global ValidationPipe, so the `page?: number`
 * annotations on PaginationDto are compile-time only. Mongoose used to cast the
 * string for us; Prisma refuses it outright:
 *
 *     Argument `take`: Invalid value provided. Expected Int, provided String.
 *
 * That surfaced as a 500 on every list endpoint the clients call with an
 * explicit page/limit — the endpoints only worked when both were omitted and
 * the JavaScript defaults (real numbers) applied.
 *
 * Also guards the two values Prisma reads as something other than a plain page
 * size: a negative `take` means "page backwards" and a fractional one throws.
 */
export interface ResolvedPagination {
  page: number;
  limit: number;
  skip: number;
}

export function resolvePagination(
  page: unknown,
  limit: unknown,
  defaultLimit = 10,
): ResolvedPagination {
  const p = Math.max(1, Math.trunc(Number(page)) || 1);
  const l = Math.max(1, Math.trunc(Number(limit)) || defaultLimit);
  return { page: p, limit: l, skip: (p - 1) * l };
}
