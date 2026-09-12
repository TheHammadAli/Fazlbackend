-- A "shop" type category groups several "product" type categories together
-- (e.g. "Vehicle" groups "Car" and "Bike"). Only meaningful when
-- categories.type = 'shop'; empty array everywhere else.
ALTER TABLE "categories" ADD COLUMN "grouped_category_ids" TEXT[] NOT NULL DEFAULT '{}';
