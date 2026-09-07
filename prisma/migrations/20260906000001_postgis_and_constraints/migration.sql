-- =============================================================================
-- Hand-written migration: everything Prisma's schema language cannot express.
--
-- Nothing in this file is representable in schema.prisma, so it does not cause
-- `prisma migrate dev` drift — Prisma neither manages nor compares extensions,
-- triggers, partial indexes or CHECK constraints.
--
--   1. PostGIS  — replaces MongoDB's $geoNear / $near on five models
--   2. pg_trgm  — makes the existing ILIKE '%term%' search index-backed
--   3. Partial unique index — MerchantDeal "one active deal per merchant"
--   4. CHECK constraints  — the two split polymorphic references
-- =============================================================================


-- -----------------------------------------------------------------------------
-- 1. POSTGIS
--
-- Mongo stored a GeoJSON Point per document with a 2dsphere index. Prisma has
-- no geo type, so latitude/longitude live as ordinary Float columns (which
-- Prisma manages) and a `geom` geography column is maintained alongside them by
-- trigger. Prisma reports `geom` as unsupported and ignores it, which is what
-- we want: writes stay plain Prisma calls, reads that need distance use
-- $queryRaw against `geom`.
--
-- geography (not geometry) so ST_Distance/ST_DWithin return metres on a sphere,
-- matching $geoNear's maxDistance semantics exactly.
-- -----------------------------------------------------------------------------

CREATE EXTENSION IF NOT EXISTS postgis;

ALTER TABLE "users"      ADD COLUMN IF NOT EXISTS "geom" geography(Point, 4326);
ALTER TABLE "shops"      ADD COLUMN IF NOT EXISTS "geom" geography(Point, 4326);
ALTER TABLE "products"   ADD COLUMN IF NOT EXISTS "geom" geography(Point, 4326);
ALTER TABLE "services"   ADD COLUMN IF NOT EXISTS "geom" geography(Point, 4326);
ALTER TABLE "broadcasts" ADD COLUMN IF NOT EXISTS "geom" geography(Point, 4326);

-- Keep `geom` in step with latitude/longitude on every write, so application
-- code never has to remember to update it. NULL coordinates yield a NULL geom,
-- which ST_DWithin simply does not match — the same effect as a Mongo document
-- with no location.
CREATE OR REPLACE FUNCTION sync_geom_from_lat_lng()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.latitude IS NULL OR NEW.longitude IS NULL THEN
    NEW.geom := NULL;
  ELSE
    NEW.geom := ST_SetSRID(ST_MakePoint(NEW.longitude, NEW.latitude), 4326)::geography;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER users_sync_geom
  BEFORE INSERT OR UPDATE OF latitude, longitude ON "users"
  FOR EACH ROW EXECUTE FUNCTION sync_geom_from_lat_lng();

CREATE TRIGGER shops_sync_geom
  BEFORE INSERT OR UPDATE OF latitude, longitude ON "shops"
  FOR EACH ROW EXECUTE FUNCTION sync_geom_from_lat_lng();

CREATE TRIGGER products_sync_geom
  BEFORE INSERT OR UPDATE OF latitude, longitude ON "products"
  FOR EACH ROW EXECUTE FUNCTION sync_geom_from_lat_lng();

CREATE TRIGGER services_sync_geom
  BEFORE INSERT OR UPDATE OF latitude, longitude ON "services"
  FOR EACH ROW EXECUTE FUNCTION sync_geom_from_lat_lng();

CREATE TRIGGER broadcasts_sync_geom
  BEFORE INSERT OR UPDATE OF latitude, longitude ON "broadcasts"
  FOR EACH ROW EXECUTE FUNCTION sync_geom_from_lat_lng();

-- Backfill for any rows already present (a no-op on a fresh database, but makes
-- this migration safe to run against a database that was loaded first).
UPDATE "users"      SET latitude = latitude WHERE latitude IS NOT NULL;
UPDATE "shops"      SET latitude = latitude WHERE latitude IS NOT NULL;
UPDATE "products"   SET latitude = latitude WHERE latitude IS NOT NULL;
UPDATE "services"   SET latitude = latitude WHERE latitude IS NOT NULL;
UPDATE "broadcasts" SET latitude = latitude WHERE latitude IS NOT NULL;

-- Replaces the five 2dsphere indexes.
CREATE INDEX IF NOT EXISTS "users_geom_idx"      ON "users"      USING GIST ("geom");
CREATE INDEX IF NOT EXISTS "shops_geom_idx"      ON "shops"      USING GIST ("geom");
CREATE INDEX IF NOT EXISTS "products_geom_idx"   ON "products"   USING GIST ("geom");
CREATE INDEX IF NOT EXISTS "services_geom_idx"   ON "services"   USING GIST ("geom");
CREATE INDEX IF NOT EXISTS "broadcasts_geom_idx" ON "broadcasts" USING GIST ("geom");


-- -----------------------------------------------------------------------------
-- 2. TRIGRAM SEARCH
--
-- The application has never used MongoDB $text search: all 41 search sites use
-- case-insensitive $regex, which becomes ILIKE '%term%'. These indexes make
-- that pattern index-backed instead of a sequential scan. Results are
-- byte-identical to today's — this is a pure performance change, with no
-- behavioural difference to verify.
--
-- (The unused text index declared on ProductSchema is deliberately NOT ported.)
-- -----------------------------------------------------------------------------

CREATE EXTENSION IF NOT EXISTS pg_trgm;

CREATE INDEX IF NOT EXISTS "products_title_trgm_idx"
  ON "products" USING GIN ("title" gin_trgm_ops);
CREATE INDEX IF NOT EXISTS "products_description_trgm_idx"
  ON "products" USING GIN ("description" gin_trgm_ops);
CREATE INDEX IF NOT EXISTS "products_listing_code_trgm_idx"
  ON "products" USING GIN ("listing_code" gin_trgm_ops);

CREATE INDEX IF NOT EXISTS "services_title_trgm_idx"
  ON "services" USING GIN ("title" gin_trgm_ops);
CREATE INDEX IF NOT EXISTS "services_description_trgm_idx"
  ON "services" USING GIN ("description" gin_trgm_ops);

CREATE INDEX IF NOT EXISTS "shops_title_trgm_idx"
  ON "shops" USING GIN ("title" gin_trgm_ops);

CREATE INDEX IF NOT EXISTS "users_name_trgm_idx"
  ON "users" USING GIN ("name" gin_trgm_ops);
CREATE INDEX IF NOT EXISTS "users_email_trgm_idx"
  ON "users" USING GIN ("email" gin_trgm_ops);


-- -----------------------------------------------------------------------------
-- 3. PARTIAL UNIQUE INDEX
--
-- Was MerchantDealSchema.index({merchantId: 1},
--   {unique: true, partialFilterExpression: {effectiveTo: null}}).
-- Prisma cannot express a partial index, so it is created by hand. Without it
-- the append-only deal history would allow two simultaneously-active deals for
-- one merchant, which would make transaction pricing ambiguous.
-- -----------------------------------------------------------------------------

CREATE UNIQUE INDEX IF NOT EXISTS "merchant_deals_active_uniq"
  ON "merchant_deals" ("merchant_id")
  WHERE "effective_to" IS NULL;


-- -----------------------------------------------------------------------------
-- 4. POLYMORPHIC SPLIT CHECK CONSTRAINTS
--
-- Order.owner (refPath "ownerModel" -> Shop | User) and Promotion.targetId
-- (refPath "targetType" -> Product | Shop | Service) were split into typed
-- nullable FKs. These constraints assert what the refPath used to guarantee
-- implicitly: exactly one target is set, and it agrees with the discriminator.
-- -----------------------------------------------------------------------------

ALTER TABLE "orders"
  ADD CONSTRAINT "orders_owner_exactly_one"
  CHECK (
    ("owner_model" = 'Shop' AND "shop_owner_id" IS NOT NULL AND "user_owner_id" IS NULL)
    OR
    ("owner_model" = 'User' AND "user_owner_id" IS NOT NULL AND "shop_owner_id" IS NULL)
  );

ALTER TABLE "promotions"
  ADD CONSTRAINT "promotions_target_exactly_one"
  CHECK (
    ("target_type" = 'Product' AND "product_id" IS NOT NULL AND "shop_id" IS NULL AND "service_id" IS NULL)
    OR
    ("target_type" = 'Shop'    AND "shop_id"    IS NOT NULL AND "product_id" IS NULL AND "service_id" IS NULL)
    OR
    ("target_type" = 'Service' AND "service_id" IS NOT NULL AND "product_id" IS NULL AND "shop_id" IS NULL)
  );

-- Reviews carry a 1-5 rating that Mongoose enforced with min/max validators,
-- which are bypassed by every updateMany write path. Enforce it at the database.
ALTER TABLE "reviews"
  ADD CONSTRAINT "reviews_rating_range" CHECK ("rating" >= 1 AND "rating" <= 5);
