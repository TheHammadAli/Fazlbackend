-- A video post has no real category to pick, and no longer gets a fake
-- sentinel one to satisfy a NOT NULL column — category_id is now nullable
-- on both tables. The existing FK constraints already only apply to
-- non-null values, so they don't need to change.
ALTER TABLE "products" ALTER COLUMN "category_id" DROP NOT NULL;
ALTER TABLE "services" ALTER COLUMN "category_id" DROP NOT NULL;

-- Any existing video post that was forced onto the sentinel "Video Post"
-- category goes back to having no category at all.
UPDATE "products" SET "category_id" = NULL
WHERE "is_video_post" = true
  AND "category_id" IN (
    SELECT "id" FROM "categories"
    WHERE "name"->>'en' = 'Video Post' AND "type" = 'product'
  );

UPDATE "services" SET "category_id" = NULL
WHERE "is_video_post" = true
  AND "category_id" IN (
    SELECT "id" FROM "categories"
    WHERE "name"->>'en' = 'Video Post' AND "type" = 'service'
  );

-- The sentinel category rows themselves are no longer referenced by
-- anything (the two updates above cleared the only rows that could have),
-- so they can be dropped outright.
DELETE FROM "categories" WHERE "name"->>'en' = 'Video Post';
