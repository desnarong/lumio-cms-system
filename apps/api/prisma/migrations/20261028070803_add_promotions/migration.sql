-- CreateTable
CREATE TABLE "promotions" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "site_id" UUID NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT NOT NULL DEFAULT '',
    "kind" TEXT NOT NULL DEFAULT 'other',
    "badge" TEXT NOT NULL DEFAULT '',
    "buy_qty" INTEGER,
    "get_qty" INTEGER,
    "starts_at" TIMESTAMPTZ(6),
    "ends_at" TIMESTAMPTZ(6),
    "active" BOOLEAN NOT NULL DEFAULT true,
    "sort" INTEGER NOT NULL DEFAULT 0,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "promotions_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "promotions_site_id_active_starts_at_ends_at_idx" ON "promotions"("site_id", "active", "starts_at", "ends_at");

-- CreateIndex
CREATE INDEX "promotions_site_id_sort_idx" ON "promotions"("site_id", "sort");

-- AddForeignKey
ALTER TABLE "promotions" ADD CONSTRAINT "promotions_site_id_fkey" FOREIGN KEY ("site_id") REFERENCES "sites"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- RowLevelSecurity: a promotion belongs to one site, like every other website row.
ALTER TABLE "promotions" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "promotions" FORCE ROW LEVEL SECURITY;
CREATE POLICY "site_isolation" ON "promotions"
    USING ("site_id" = NULLIF(current_setting('app.current_site', true), '')::uuid)
    WITH CHECK ("site_id" = NULLIF(current_setting('app.current_site', true), '')::uuid);
