import type { Prisma } from "../../generated/prisma/client";

/**
 * Replaces Mongoose's `select: false`, which has NO Prisma equivalent.
 *
 * users.schema.ts marked `password`, `memberPassword`, `refreshToken`,
 * `resetPasswordToken`, `resetPasswordExpires` and `provider` as select:false,
 * which silently kept them out of every query result. Prisma returns every
 * scalar column by default, so porting the model without this would start
 * serialising password hashes and refresh tokens into ordinary API responses.
 *
 * Every read path that returns a user to a client MUST use one of these. The
 * only queries allowed to read a secret column are the auth flows that
 * genuinely need it, and those select the single field they need rather than
 * widening these constants.
 */
export const userPublicSelect = {
  id: true,
  userCode: true,
  name: true,
  email: true,
  roles: true,
  phone: true,
  latitude: true,
  longitude: true,
  image: true,
  address: true,
  fcmToken: true,
  fcmTokens: true,
  isDisabled: true,
  lastSeenAt: true,
  createdAt: true,
  updatedAt: true,
  permissions: {
    select: {
      page: true,
      actions: true,
    },
  },
} satisfies Prisma.UserSelect;

/**
 * The same set minus permissions, for the many places that embed a user as a
 * relation (message sender, shop owner, review author) and never render their
 * admin permission matrix.
 */
export const userSummarySelect = {
  id: true,
  userCode: true,
  name: true,
  email: true,
  phone: true,
  image: true,
  isDisabled: true,
  lastSeenAt: true,
} satisfies Prisma.UserSelect;
