-- Shop products and orders (docs/design/03-scope.md 3.3, 11-data-model.md 11.4).
--
-- Prices are integer satang so totals never drift. An order copies title/price
-- onto its items, so editing or deleting a product later cannot rewrite an old
-- receipt. Both tables are site-scoped and get the same RLS policy as content.

CREATE TABLE "products" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "site_id" UUID NOT NULL,
    "title" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "description" TEXT NOT NULL DEFAULT '',
    "price" INTEGER NOT NULL,
    "compare_at_price" INTEGER,
    "currency" TEXT NOT NULL DEFAULT 'THB',
    "images" JSONB NOT NULL DEFAULT '[]',
    "stock" INTEGER,
    "category" TEXT,
    "status" TEXT NOT NULL DEFAULT 'draft',
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "products_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "orders" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "site_id" UUID NOT NULL,
    "number" TEXT NOT NULL,
    "token" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'pending',
    "payment_method" TEXT NOT NULL,
    "customer" JSONB NOT NULL,
    "note" TEXT NOT NULL DEFAULT '',
    "subtotal" INTEGER NOT NULL,
    "shipping_fee" INTEGER NOT NULL,
    "total" INTEGER NOT NULL,
    "currency" TEXT NOT NULL DEFAULT 'THB',
    "tracking_number" TEXT,
    "paid_at" TIMESTAMPTZ(6),
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "orders_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "order_items" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "order_id" UUID NOT NULL,
    "site_id" UUID NOT NULL,
    "product_id" UUID,
    "title" TEXT NOT NULL,
    "price" INTEGER NOT NULL,
    "quantity" INTEGER NOT NULL,
    "image" TEXT,

    CONSTRAINT "order_items_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "products_site_id_slug_key" ON "products"("site_id", "slug");
CREATE INDEX "products_site_id_status_created_at_idx"
    ON "products"("site_id", "status", "created_at" DESC);
CREATE INDEX "products_site_id_category_idx" ON "products"("site_id", "category");

CREATE UNIQUE INDEX "orders_token_key" ON "orders"("token");
CREATE UNIQUE INDEX "orders_site_id_number_key" ON "orders"("site_id", "number");
CREATE INDEX "orders_site_id_status_created_at_idx"
    ON "orders"("site_id", "status", "created_at" DESC);

CREATE INDEX "order_items_order_id_idx" ON "order_items"("order_id");
CREATE INDEX "order_items_site_id_idx" ON "order_items"("site_id");

ALTER TABLE "products" ADD CONSTRAINT "products_site_id_fkey"
    FOREIGN KEY ("site_id") REFERENCES "sites"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "orders" ADD CONSTRAINT "orders_site_id_fkey"
    FOREIGN KEY ("site_id") REFERENCES "sites"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "order_items" ADD CONSTRAINT "order_items_order_id_fkey"
    FOREIGN KEY ("order_id") REFERENCES "orders"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "order_items" ADD CONSTRAINT "order_items_product_id_fkey"
    FOREIGN KEY ("product_id") REFERENCES "products"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "products" ADD CONSTRAINT "products_price_check" CHECK ("price" >= 0);
ALTER TABLE "products" ADD CONSTRAINT "products_compare_at_price_check"
    CHECK ("compare_at_price" IS NULL OR "compare_at_price" > "price");
ALTER TABLE "products" ADD CONSTRAINT "products_stock_check"
    CHECK ("stock" IS NULL OR "stock" >= 0);
ALTER TABLE "products" ADD CONSTRAINT "products_status_check"
    CHECK ("status" IN ('draft', 'active', 'archived'));

ALTER TABLE "orders" ADD CONSTRAINT "orders_status_check"
    CHECK ("status" IN ('pending', 'paid', 'shipped', 'completed', 'cancelled'));
ALTER TABLE "orders" ADD CONSTRAINT "orders_payment_method_check"
    CHECK ("payment_method" IN ('promptpay', 'cod'));
ALTER TABLE "orders" ADD CONSTRAINT "orders_total_check"
    CHECK ("subtotal" >= 0 AND "shipping_fee" >= 0 AND "total" = "subtotal" + "shipping_fee");

ALTER TABLE "order_items" ADD CONSTRAINT "order_items_quantity_check" CHECK ("quantity" > 0);
ALTER TABLE "order_items" ADD CONSTRAINT "order_items_price_check" CHECK ("price" >= 0);

ALTER TABLE "products" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "products" FORCE ROW LEVEL SECURITY;
CREATE POLICY "site_isolation" ON "products"
    USING ("site_id" = NULLIF(current_setting('app.current_site', true), '')::uuid)
    WITH CHECK ("site_id" = NULLIF(current_setting('app.current_site', true), '')::uuid);

ALTER TABLE "orders" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "orders" FORCE ROW LEVEL SECURITY;
CREATE POLICY "site_isolation" ON "orders"
    USING ("site_id" = NULLIF(current_setting('app.current_site', true), '')::uuid)
    WITH CHECK ("site_id" = NULLIF(current_setting('app.current_site', true), '')::uuid);

ALTER TABLE "order_items" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "order_items" FORCE ROW LEVEL SECURITY;
CREATE POLICY "site_isolation" ON "order_items"
    USING ("site_id" = NULLIF(current_setting('app.current_site', true), '')::uuid)
    WITH CHECK ("site_id" = NULLIF(current_setting('app.current_site', true), '')::uuid);
