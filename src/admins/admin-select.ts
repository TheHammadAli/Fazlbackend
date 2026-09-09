import type { Prisma } from "../../generated/prisma/client";

/**
 * Same job as user-select.ts: Prisma returns every scalar column by default, so
 * without an explicit select a staff row would serialise its password hash and
 * refresh token into ordinary API responses.
 *
 * Every read path that returns an admin or a member to a client MUST use one of
 * these. The auth flow is the only thing allowed to read `password`, and it
 * selects that single field rather than widening these.
 */
export const adminPublicSelect = {
  id: true,
  adminCode: true,
  name: true,
  email: true,
  role: true,
  phone: true,
  image: true,
  isDisabled: true,
  lastSeenAt: true,
  createdAt: true,
  updatedAt: true,
  createdById: true,
  permissions: {
    select: {
      page: true,
      actions: true,
    },
  },
} satisfies Prisma.AdminSelect;

export const memberPublicSelect = {
  id: true,
  memberCode: true,
  name: true,
  email: true,
  phone: true,
  image: true,
  isDisabled: true,
  lastSeenAt: true,
  createdAt: true,
  updatedAt: true,
  createdById: true,
} satisfies Prisma.MemberSelect;

/** For embedding staff as a relation (task creator, log actor, report closer). */
export const staffSummarySelect = {
  id: true,
  name: true,
  email: true,
  image: true,
} as const;
