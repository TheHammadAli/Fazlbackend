-- A video post can optionally tag one real listing to promote — "look what
-- we have" rather than just a caption. Products can already tag another
-- product; a service's video post can tag one too. Both self/cross-reference
-- Product, so both are nullable, SET NULL on delete (losing the tagged
-- listing shouldn't take the video post down with it).

ALTER TABLE "products" ADD COLUMN "tagged_product_id" VARCHAR(24);
ALTER TABLE "products" ADD CONSTRAINT "products_tagged_product_id_fkey"
  FOREIGN KEY ("tagged_product_id") REFERENCES "products"("id")
  ON DELETE SET NULL ON UPDATE CASCADE;
CREATE INDEX "products_tagged_product_id_idx" ON "products"("tagged_product_id");

-- Services gain the same lightweight "just a video" concept Products already
-- have. A real service is capped at one per user (enforced in application
-- code); video posts are excluded from that cap the same way this migration
-- adds no constraint preventing many per user.
ALTER TABLE "services" ADD COLUMN "is_video_post" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "services" ADD COLUMN "video_code" TEXT;
ALTER TABLE "services" ADD CONSTRAINT "services_video_code_key" UNIQUE ("video_code");

ALTER TABLE "services" ADD COLUMN "tagged_product_id" VARCHAR(24);
ALTER TABLE "services" ADD CONSTRAINT "services_tagged_product_id_fkey"
  FOREIGN KEY ("tagged_product_id") REFERENCES "products"("id")
  ON DELETE SET NULL ON UPDATE CASCADE;
CREATE INDEX "services_tagged_product_id_idx" ON "services"("tagged_product_id");
CREATE INDEX "services_owner_id_is_video_post_is_deleted_is_disabled_idx"
  ON "services"("owner_id", "is_video_post", "is_deleted", "is_disabled");
