-- Promotion cards can carry a picture chosen from the media library.
ALTER TABLE "promotions"
  ADD COLUMN "image_url" TEXT,
  ADD COLUMN "image_alt" TEXT NOT NULL DEFAULT '';
