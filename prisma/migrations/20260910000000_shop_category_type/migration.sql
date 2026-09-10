-- Shops were classified with product categories, so the two lists could never
-- differ and an admin had no way to curate shop types on their own. This adds
-- the third value; existing shops keep whatever category they already point at.

ALTER TYPE "CategoryType" ADD VALUE IF NOT EXISTS 'shop';
