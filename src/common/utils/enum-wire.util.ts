/**
 * Translation between the values the API speaks and the identifiers the Prisma
 * client uses.
 *
 * Three enum members in prisma/schema.prisma carry an @map, because their real
 * value is not a legal Prisma identifier:
 *
 *     DeliveryOption.self_pickup       @map("self-pickup")
 *     ReportReason.AdultContent        @map("Adult Content")
 *     AdminPermissionPage.email_logs   @map("email-logs")
 *
 * Postgres stores the mapped value, but the generated TypeScript client reads
 * and writes the identifier. Left alone that would silently change the API:
 * clients send "self-pickup" and have always been given "self-pickup" back,
 * and would start receiving "self_pickup" instead.
 *
 * These helpers convert at the service boundary so the wire format is exactly
 * what it was under Mongoose. Every other enum in the schema has identical
 * identifier and value and needs none of this.
 */

/** Builds a pair of lookup functions from an identifier -> wire-value map. */
function bidirectional<const T extends Record<string, string>>(map: T) {
  const toWire = map as Record<string, string>;
  const fromWire: Record<string, string> = {};
  for (const [identifier, wire] of Object.entries(map)) {
    fromWire[wire] = identifier;
  }

  return {
    /** Prisma identifier -> the value clients expect. Unknown input passes through. */
    toWire: (value: string | null | undefined): any =>
      value == null ? value : (toWire[value] ?? value),
    /** Client value -> the Prisma identifier. Unknown input passes through. */
    fromWire: (value: string | null | undefined): any =>
      value == null ? value : (fromWire[value] ?? value),
  };
}

export const deliveryOption = bidirectional({
  self_pickup: "self-pickup",
  delivery: "delivery",
});

export const reportReason = bidirectional({
  Spam: "Spam",
  AdultContent: "Adult Content",
  Fraud: "Fraud",
  Duplicate: "Duplicate",
  Other: "Other",
});

export const adminPermissionPage = bidirectional({
  users: "users",
  shops: "shops",
  listings: "listings",
  services: "services",
  categories: "categories",
  bookings: "bookings",
  broadcasts: "broadcasts",
  announcements: "announcements",
  feed: "feed",
  reports: "reports",
  email_logs: "email-logs",
  settings: "settings",
  members: "members",
  wallet: "wallet",
  reviews: "reviews",
});
