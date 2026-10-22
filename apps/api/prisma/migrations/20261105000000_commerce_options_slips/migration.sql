-- Product variants, delivery weight and payment slips (docs/design/03-scope.md
-- 3.3, 11-data-model.md 11.4). Variants own their own stock so two sizes of the
-- same product are not forced to share one counter, and every new table is
-- site-scoped with the same RLS policy as the rest of the tenant data.

ALTER TABLE "products" ADD COLUMN "weight_grams" INTEGER NOT NULL DEFAULT 0;
ALTER TABLE "products" ADD COLUMN "options" JSONB NOT NULL DEFAULT '[]';
ALTER TABLE "products" ADD CONSTRAINT "products_weight_grams_check"
    CHECK ("weight_grams" >= 0);

ALTER TABLE "orders" ADD COLUMN "seller_transfer_id" TEXT;
ALTER TABLE "orders" ADD COLUMN "seller_transfer_at" TIMESTAMPTZ(6);

ALTER TABLE "order_items" ADD COLUMN "variant_id" UUID;
ALTER TABLE "order_items" ADD COLUMN "variant_label" TEXT;

CREATE TABLE "product_variants" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "site_id" UUID NOT NULL,
    "product_id" UUID NOT NULL,
    "signature" TEXT NOT NULL,
    "options" JSONB NOT NULL,
    "label" TEXT NOT NULL DEFAULT '',
    "sku" TEXT,
    "price" INTEGER,
    "compare_at_price" INTEGER,
    "stock" INTEGER,
    "position" INTEGER NOT NULL DEFAULT 0,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "product_variants_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "payment_slips" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "site_id" UUID NOT NULL,
    "order_id" UUID NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'pending_review',
    "amount" INTEGER NOT NULL,
    "reference" TEXT NOT NULL,
    "image_url" TEXT NOT NULL,
    "note" TEXT NOT NULL DEFAULT '',
    "reviewed_by" UUID,
    "reviewed_at" TIMESTAMPTZ(6),
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "payment_slips_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "product_variants_product_id_signature_key"
    ON "product_variants"("product_id", "signature");
CREATE INDEX "product_variants_site_id_product_id_idx"
    ON "product_variants"("site_id", "product_id");
CREATE UNIQUE INDEX "payment_slips_site_id_reference_key"
    ON "payment_slips"("site_id", "reference");
CREATE INDEX "payment_slips_site_id_order_id_created_at_idx"
    ON "payment_slips"("site_id", "order_id", "created_at" DESC);
CREATE INDEX "order_items_variant_id_idx" ON "order_items"("variant_id");

ALTER TABLE "product_variants" ADD CONSTRAINT "product_variants_site_id_fkey"
    FOREIGN KEY ("site_id") REFERENCES "sites"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "product_variants" ADD CONSTRAINT "product_variants_product_id_fkey"
    FOREIGN KEY ("product_id") REFERENCES "products"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "payment_slips" ADD CONSTRAINT "payment_slips_site_id_fkey"
    FOREIGN KEY ("site_id") REFERENCES "sites"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "payment_slips" ADD CONSTRAINT "payment_slips_order_id_fkey"
    FOREIGN KEY ("order_id") REFERENCES "orders"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "order_items" ADD CONSTRAINT "order_items_variant_id_fkey"
    FOREIGN KEY ("variant_id") REFERENCES "product_variants"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "product_variants" ADD CONSTRAINT "product_variants_price_check"
    CHECK ("price" IS NULL OR "price" >= 0);
ALTER TABLE "product_variants" ADD CONSTRAINT "product_variants_compare_at_price_check"
    CHECK ("compare_at_price" IS NULL OR "price" IS NULL OR "compare_at_price" > "price");
ALTER TABLE "product_variants" ADD CONSTRAINT "product_variants_stock_check"
    CHECK ("stock" IS NULL OR "stock" >= 0);

ALTER TABLE "payment_slips" ADD CONSTRAINT "payment_slips_status_check"
    CHECK ("status" IN ('pending_review', 'verified', 'rejected'));
ALTER TABLE "payment_slips" ADD CONSTRAINT "payment_slips_amount_check" CHECK ("amount" > 0);
ALTER TABLE "payment_slips" ADD CONSTRAINT "payment_slips_reference_check"
    CHECK ("reference" ~ '^[A-Za-z0-9-]{4,60}$');

ALTER TABLE "product_variants" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "product_variants" FORCE ROW LEVEL SECURITY;
CREATE POLICY "site_isolation" ON "product_variants"
    USING ("site_id" = NULLIF(current_setting('app.current_site', true), '')::uuid)
    WITH CHECK ("site_id" = NULLIF(current_setting('app.current_site', true), '')::uuid);

ALTER TABLE "payment_slips" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "payment_slips" FORCE ROW LEVEL SECURITY;
CREATE POLICY "site_isolation" ON "payment_slips"
    USING ("site_id" = NULLIF(current_setting('app.current_site', true), '')::uuid)
    WITH CHECK ("site_id" = NULLIF(current_setting('app.current_site', true), '')::uuid);
