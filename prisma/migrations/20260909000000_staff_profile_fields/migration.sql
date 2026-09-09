-- Staff need the profile fields the admin panel already edits.
--
-- The panel's Edit Profile modal has always sent `phone` and `address`. Before
-- the split those landed on the staff member's `users` row; the new tables were
-- created without an address column, so that half of the form had nowhere to go.
--
-- `admins.phone` also loses its UNIQUE index. It was carried over from `users`,
-- where a phone number identifies an account. For staff it is only a contact
-- detail — two people sharing an office line is normal — and uniqueness there
-- would have rejected that for no benefit.

ALTER TABLE "admins"  ADD COLUMN "address" TEXT;
ALTER TABLE "members" ADD COLUMN "address" TEXT;

DROP INDEX "admins_phone_key";
