-- Split staff out of `users` into their own tables.
--
-- Before: one `users` table, staff identified by a `roles[]` array containing
-- super_admin/admin/subadmin/moderator, with a second `member_password` column
-- so the same row could hold two logins (app + admin panel).
--
-- After: `admins` (super_admin | admin | subadmin) and `members` are separate
-- tables with their own ids, passwords and codes. `users` holds customers only
-- and can never grant admin-panel access.
--
-- Ids are PRESERVED on the way across: an admin keeps the id its user row had.
-- That is what makes this migration cheap — every FK column that already holds
-- a staff id (announcements.created_by, activity_logs.actor_id, ...) stays
-- valid, so only the constraint is repointed, never the data.
--
-- NOTE: this file is written by hand rather than taken from `prisma migrate
-- diff`. The generated diff also wanted to drop every PostGIS `geom` column and
-- every pg_trgm index, because those are created by raw SQL in
-- 20260906000001_postgis_and_constraints and so are invisible to the Prisma
-- schema. Dropping them would silently break location search.

-- =============================================================================
-- 1. Staff tables
-- =============================================================================

CREATE TYPE "AdminRole" AS ENUM ('super_admin', 'admin', 'subadmin');

CREATE TABLE "admins" (
    "id" VARCHAR(24) NOT NULL,
    "admin_code" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "password" TEXT NOT NULL,
    "role" "AdminRole" NOT NULL,
    "phone" TEXT,
    "image" TEXT DEFAULT 'default-avatar.png',
    "is_disabled" BOOLEAN NOT NULL DEFAULT false,
    "last_seen_at" TIMESTAMPTZ(3),
    "refresh_token" TEXT,
    "created_by" VARCHAR(24),
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "admins_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "members" (
    "id" VARCHAR(24) NOT NULL,
    "member_code" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "password" TEXT NOT NULL,
    "phone" TEXT,
    "image" TEXT DEFAULT 'default-avatar.png',
    "is_disabled" BOOLEAN NOT NULL DEFAULT false,
    "last_seen_at" TIMESTAMPTZ(3),
    "refresh_token" TEXT,
    "created_by" VARCHAR(24) NOT NULL,
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "members_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "admin_permissions" (
    "id" TEXT NOT NULL,
    "admin_id" VARCHAR(24) NOT NULL,
    "page" "AdminPermissionPage" NOT NULL,
    "actions" "AdminAction"[] DEFAULT ARRAY[]::"AdminAction"[],

    CONSTRAINT "admin_permissions_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "admins_admin_code_key" ON "admins"("admin_code");
CREATE UNIQUE INDEX "admins_email_key" ON "admins"("email");
CREATE UNIQUE INDEX "admins_phone_key" ON "admins"("phone");
CREATE INDEX "admins_email_idx" ON "admins"("email");
CREATE INDEX "admins_role_idx" ON "admins"("role");
CREATE INDEX "admins_is_disabled_idx" ON "admins"("is_disabled");
CREATE INDEX "admins_created_by_idx" ON "admins"("created_by");

CREATE UNIQUE INDEX "members_member_code_key" ON "members"("member_code");
CREATE UNIQUE INDEX "members_email_key" ON "members"("email");
CREATE INDEX "members_email_idx" ON "members"("email");
CREATE INDEX "members_is_disabled_idx" ON "members"("is_disabled");
CREATE INDEX "members_created_by_idx" ON "members"("created_by");

CREATE INDEX "admin_permissions_admin_id_idx" ON "admin_permissions"("admin_id");
CREATE UNIQUE INDEX "admin_permissions_admin_id_page_key" ON "admin_permissions"("admin_id", "page");

-- =============================================================================
-- 2. Release the old constraints
--
-- Every FK below currently points at `users`. They are dropped before the data
-- moves so staff rows can leave `users`, and re-added against `admins` /
-- `members` in step 6. The COLUMN VALUES are never touched.
-- =============================================================================

ALTER TABLE "user_permissions"      DROP CONSTRAINT "user_permissions_user_id_fkey";
ALTER TABLE "category_requests"     DROP CONSTRAINT "category_requests_reviewed_by_fkey";
ALTER TABLE "reports"               DROP CONSTRAINT "reports_closed_by_fkey";
ALTER TABLE "reports"               DROP CONSTRAINT "reports_responded_by_fkey";
ALTER TABLE "announcements"         DROP CONSTRAINT "announcements_created_by_fkey";
ALTER TABLE "tasks"                 DROP CONSTRAINT "tasks_created_by_fkey";
ALTER TABLE "task_assignees"        DROP CONSTRAINT "task_assignees_user_id_fkey";
ALTER TABLE "task_submissions"      DROP CONSTRAINT "task_submissions_submitted_by_fkey";
ALTER TABLE "activity_logs"         DROP CONSTRAINT "activity_logs_actor_id_fkey";
ALTER TABLE "wallets"               DROP CONSTRAINT "wallets_frozen_by_fkey";
ALTER TABLE "wallet_transactions"   DROP CONSTRAINT "wallet_transactions_created_by_fkey";
ALTER TABLE "wallet_ledger_entries" DROP CONSTRAINT "wallet_ledger_entries_created_by_fkey";
ALTER TABLE "withdrawals"           DROP CONSTRAINT "withdrawals_created_by_fkey";
ALTER TABLE "refunds"               DROP CONSTRAINT "refunds_created_by_fkey";
ALTER TABLE "merchant_deals"        DROP CONSTRAINT "merchant_deals_created_by_fkey";
ALTER TABLE "wallet_settings"       DROP CONSTRAINT "wallet_settings_updated_by_fkey";
ALTER TABLE "wallet_audit_logs"     DROP CONSTRAINT "wallet_audit_logs_admin_id_fkey";

-- =============================================================================
-- 3. Move the people
-- =============================================================================

-- Admins, keeping their existing id. `member_password` is the admin-panel
-- password where one was set (a promoted customer); otherwise the account was
-- created as staff and `password` is the only one it has.
--
-- Codes are assigned ADM-000001.. ordered by creation, so the seeded first
-- super_admin gets ADM-000001.
INSERT INTO "admins" (
    "id", "admin_code", "name", "email", "password", "role",
    "phone", "image", "is_disabled", "last_seen_at", "refresh_token",
    "created_by", "created_at", "updated_at"
)
SELECT
    u."id",
    'ADM-' || LPAD((ROW_NUMBER() OVER (ORDER BY u."created_at", u."id"))::text, 6, '0'),
    COALESCE(u."name", split_part(u."email", '@', 1)),
    u."email",
    COALESCE(u."member_password", u."password"),
    (CASE
        WHEN 'super_admin' = ANY(u."roles"::text[]) THEN 'super_admin'
        WHEN 'admin'       = ANY(u."roles"::text[]) THEN 'admin'
        ELSE 'subadmin'
     END)::"AdminRole",
    -- phone is UNIQUE on both tables; leaving it behind avoids a collision with
    -- the customer row when the same person exists in both.
    NULL,
    u."image",
    u."is_disabled",
    u."last_seen_at",
    NULL,
    NULL,
    u."created_at",
    u."updated_at"
FROM "users" u
WHERE u."roles"::text[] && ARRAY['super_admin', 'admin', 'subadmin']
  AND COALESCE(u."member_password", u."password") IS NOT NULL;

-- Members. `created_by` is NOT NULL, so they are attributed to the oldest
-- admin. If moderators exist with no admin at all to attribute them to, this
-- fails loudly rather than inventing an owner.
INSERT INTO "members" (
    "id", "member_code", "name", "email", "password",
    "phone", "image", "is_disabled", "last_seen_at", "refresh_token",
    "created_by", "created_at", "updated_at"
)
SELECT
    u."id",
    'MEM-' || LPAD((ROW_NUMBER() OVER (ORDER BY u."created_at", u."id"))::text, 6, '0'),
    COALESCE(u."name", split_part(u."email", '@', 1)),
    u."email",
    COALESCE(u."member_password", u."password"),
    NULL,
    u."image",
    u."is_disabled",
    u."last_seen_at",
    NULL,
    (SELECT a."id" FROM "admins" a ORDER BY a."created_at", a."id" LIMIT 1),
    u."created_at",
    u."updated_at"
FROM "users" u
WHERE 'moderator' = ANY(u."roles"::text[])
  AND NOT (u."roles"::text[] && ARRAY['super_admin', 'admin', 'subadmin'])
  AND COALESCE(u."member_password", u."password") IS NOT NULL;

-- Permissions follow their admin. Rows belonging to a moderator are dropped:
-- members no longer carry per-page permissions, their access is fixed to tasks.
INSERT INTO "admin_permissions" ("id", "admin_id", "page", "actions")
SELECT p."id", p."user_id", p."page", p."actions"
FROM "user_permissions" p
WHERE EXISTS (SELECT 1 FROM "admins" a WHERE a."id" = p."user_id");

-- Keep the code counters in step with what was just inserted, so the services
-- that mint ADM-/MEM- codes continue the sequence instead of restarting at 1.
INSERT INTO "counters" ("id", "seq")
VALUES ('adminCode', (SELECT COUNT(*)::int FROM "admins"))
ON CONFLICT ("id") DO UPDATE SET "seq" = EXCLUDED."seq";

INSERT INTO "counters" ("id", "seq")
VALUES ('memberCode', (SELECT COUNT(*)::int FROM "members"))
ON CONFLICT ("id") DO UPDATE SET "seq" = EXCLUDED."seq";

-- =============================================================================
-- 4. Repoint the activity log's actor
-- =============================================================================

ALTER TABLE "activity_logs"
    ADD COLUMN "actor_admin_id"  VARCHAR(24),
    ADD COLUMN "actor_member_id" VARCHAR(24);

UPDATE "activity_logs" l
SET "actor_admin_id" = l."actor_id"
WHERE EXISTS (SELECT 1 FROM "admins" a WHERE a."id" = l."actor_id");

UPDATE "activity_logs" l
SET "actor_member_id" = l."actor_id"
WHERE EXISTS (SELECT 1 FROM "members" m WHERE m."id" = l."actor_id");

-- Only staff actions are ever logged, so a row whose actor resolved to neither
-- table is a log for an account that no longer exists as staff. It cannot
-- satisfy the CHECK below and has no actor to display, so it is removed.
DELETE FROM "activity_logs"
WHERE "actor_admin_id" IS NULL AND "actor_member_id" IS NULL;

-- Drops "activity_logs_actor_id_created_at_idx" with it.
ALTER TABLE "activity_logs" DROP COLUMN "actor_id";

ALTER TABLE "activity_logs"
    ADD CONSTRAINT "activity_logs_one_actor_check"
    CHECK (("actor_admin_id" IS NULL) <> ("actor_member_id" IS NULL));

CREATE INDEX "activity_logs_actor_admin_id_created_at_idx"  ON "activity_logs"("actor_admin_id", "created_at" DESC);
CREATE INDEX "activity_logs_actor_member_id_created_at_idx" ON "activity_logs"("actor_member_id", "created_at" DESC);

-- =============================================================================
-- 5. Take staff out of `users`
-- =============================================================================

-- task_assignees now names members. Renamed rather than dropped and re-added so
-- existing assignments survive. The primary key follows the rename on its own,
-- so only the secondary index needs renaming.
ALTER TABLE "task_assignees" RENAME COLUMN "user_id" TO "member_id";
ALTER INDEX "task_assignees_user_id_idx" RENAME TO "task_assignees_member_id_idx";

DROP TABLE "user_permissions";

-- A person who was staff AND a customer keeps their customer row; the split
-- means one human is now two rows. A staff-only row has nothing left to be and
-- is removed, now that `admins`/`members` hold it.
--
-- Scoped to rows that actually carried a staff role, so an account with an
-- empty `roles` array is left alone rather than swept up. Cascading deletes on
-- shops/products/orders make this destructive in principle, but a row with no
-- buyer or seller role never had any of those to begin with.
DELETE FROM "users"
WHERE "roles"::text[] && ARRAY['super_admin', 'admin', 'subadmin', 'moderator']
  AND NOT ("roles"::text[] && ARRAY['buyer', 'seller']);

UPDATE "users"
SET "roles" = ARRAY(
    SELECT r FROM unnest("roles"::text[]) AS r
    WHERE r IN ('buyer', 'seller')
)::"UserRole"[]
WHERE "roles"::text[] && ARRAY['super_admin', 'admin', 'subadmin', 'moderator'];

ALTER TABLE "users" DROP COLUMN "member_password";

-- Safe only because the UPDATE above stripped every staff value from the column.
CREATE TYPE "UserRole_new" AS ENUM ('buyer', 'seller');
ALTER TABLE "users" ALTER COLUMN "roles" TYPE "UserRole_new"[] USING ("roles"::text::"UserRole_new"[]);
ALTER TYPE "UserRole" RENAME TO "UserRole_old";
ALTER TYPE "UserRole_new" RENAME TO "UserRole";
DROP TYPE "public"."UserRole_old";

-- =============================================================================
-- 6. New constraints
-- =============================================================================

ALTER TABLE "admins"            ADD CONSTRAINT "admins_created_by_fkey"            FOREIGN KEY ("created_by")    REFERENCES "admins"("id")  ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "members"           ADD CONSTRAINT "members_created_by_fkey"           FOREIGN KEY ("created_by")    REFERENCES "admins"("id")  ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "admin_permissions" ADD CONSTRAINT "admin_permissions_admin_id_fkey"   FOREIGN KEY ("admin_id")      REFERENCES "admins"("id")  ON DELETE CASCADE  ON UPDATE CASCADE;

ALTER TABLE "category_requests" ADD CONSTRAINT "category_requests_reviewed_by_fkey" FOREIGN KEY ("reviewed_by")  REFERENCES "admins"("id")  ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "reports"           ADD CONSTRAINT "reports_closed_by_fkey"             FOREIGN KEY ("closed_by")    REFERENCES "admins"("id")  ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "reports"           ADD CONSTRAINT "reports_responded_by_fkey"          FOREIGN KEY ("responded_by") REFERENCES "admins"("id")  ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "announcements"     ADD CONSTRAINT "announcements_created_by_fkey"      FOREIGN KEY ("created_by")   REFERENCES "admins"("id")  ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "tasks"             ADD CONSTRAINT "tasks_created_by_fkey"              FOREIGN KEY ("created_by")   REFERENCES "admins"("id")  ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "task_assignees"    ADD CONSTRAINT "task_assignees_member_id_fkey"      FOREIGN KEY ("member_id")    REFERENCES "members"("id") ON DELETE CASCADE  ON UPDATE CASCADE;
ALTER TABLE "task_submissions"  ADD CONSTRAINT "task_submissions_submitted_by_fkey" FOREIGN KEY ("submitted_by") REFERENCES "members"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "activity_logs"     ADD CONSTRAINT "activity_logs_actor_admin_id_fkey"  FOREIGN KEY ("actor_admin_id")  REFERENCES "admins"("id")  ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "activity_logs"     ADD CONSTRAINT "activity_logs_actor_member_id_fkey" FOREIGN KEY ("actor_member_id") REFERENCES "members"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "wallets"               ADD CONSTRAINT "wallets_frozen_by_fkey"               FOREIGN KEY ("frozen_by")    REFERENCES "admins"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "wallet_transactions"   ADD CONSTRAINT "wallet_transactions_created_by_fkey"   FOREIGN KEY ("created_by")   REFERENCES "admins"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "wallet_ledger_entries" ADD CONSTRAINT "wallet_ledger_entries_created_by_fkey" FOREIGN KEY ("created_by")   REFERENCES "admins"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "withdrawals"           ADD CONSTRAINT "withdrawals_created_by_fkey"           FOREIGN KEY ("created_by")   REFERENCES "admins"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "refunds"               ADD CONSTRAINT "refunds_created_by_fkey"               FOREIGN KEY ("created_by")   REFERENCES "admins"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "merchant_deals"        ADD CONSTRAINT "merchant_deals_created_by_fkey"        FOREIGN KEY ("created_by")   REFERENCES "admins"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "wallet_settings"       ADD CONSTRAINT "wallet_settings_updated_by_fkey"       FOREIGN KEY ("updated_by")   REFERENCES "admins"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "wallet_audit_logs"     ADD CONSTRAINT "wallet_audit_logs_admin_id_fkey"       FOREIGN KEY ("admin_id")     REFERENCES "admins"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
