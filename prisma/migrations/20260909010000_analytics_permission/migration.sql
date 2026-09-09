-- Adds "analytics" to the sections a super admin can grant.
--
-- The admin panel has an Analytics page and its permission picker has always
-- offered it, but the value was missing from this enum and from
-- ADMIN_PERMISSIONS. Ticking Analytics therefore failed the whole save with
-- "Invalid permission page: analytics", so that page could never be granted to
-- anyone — it was only ever visible through the super_admin bypass.

-- Placed BEFORE 'settings' so the database's value order matches the order in
-- schema.prisma; appending would leave the two out of step and show as drift on
-- every later diff.
ALTER TYPE "AdminPermissionPage" ADD VALUE IF NOT EXISTS 'analytics' BEFORE 'settings';
