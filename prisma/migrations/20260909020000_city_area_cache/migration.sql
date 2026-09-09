-- Stores the areas of a city once they have been worked out, so the Geocoding
-- grid that discovers them runs once per city rather than on every shop form.
--
-- See CityAreaCache in schema.prisma for why a grid is needed at all: Google
-- has no call that lists a city's neighbourhoods.

CREATE TABLE "city_area_cache" (
    "city_key" TEXT NOT NULL,
    "city_name" TEXT NOT NULL,
    "latitude" DOUBLE PRECISION,
    "longitude" DOUBLE PRECISION,
    "areas" JSONB NOT NULL DEFAULT '[]',
    "fetched_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "city_area_cache_pkey" PRIMARY KEY ("city_key")
);
