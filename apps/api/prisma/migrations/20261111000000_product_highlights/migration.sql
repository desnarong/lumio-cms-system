-- Product page highlights: a one-line selling point, a short introduction and
-- the aggregate review score the shop types in.
ALTER TABLE "products"
  ADD COLUMN "tagline" TEXT NOT NULL DEFAULT '',
  ADD COLUMN "summary" TEXT NOT NULL DEFAULT '',
  ADD COLUMN "rating" DOUBLE PRECISION,
  ADD COLUMN "rating_count" INTEGER NOT NULL DEFAULT 0;
