-- Where a private listing is.
--
-- A shop's products take their location from the shop, so these stay null
-- there; a listing posted by a person has nowhere else to carry it. Same pair
-- and same index as shops, so listings can be browsed by city then area the
-- same way.

ALTER TABLE "products" ADD COLUMN "city" TEXT;
ALTER TABLE "products" ADD COLUMN "area" TEXT;

CREATE INDEX "products_city_area_idx" ON "products"("city", "area");
