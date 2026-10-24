-- Product specification table rows, e.g. wattage, lumens and base type.
ALTER TABLE "products"
  ADD COLUMN "specs" JSONB NOT NULL DEFAULT '[]';
