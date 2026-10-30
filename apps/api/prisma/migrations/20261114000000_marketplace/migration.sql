-- Block marketplace packs (docs/PROGRESS.md "ก้อนถัดไป B").
--
-- A row is one pack this site installed. Packs carry ready-made sections built
-- from blocks Lumio already ships, so the table stores a validated manifest, not
-- code. Third-party packs keep the signed token they were accepted from, so the
-- provenance can be re-checked; official packs leave it empty.
--
-- The table is site data, so it uses the same RLS policy as content.

CREATE TABLE "site_block_packs" (
    "site_id" UUID NOT NULL,
    "pack_key" TEXT NOT NULL,
    "version" TEXT NOT NULL,
    "source" TEXT NOT NULL DEFAULT 'official',
    "manifest" JSONB NOT NULL,
    "token" TEXT,
    "enabled" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "site_block_packs_pkey" PRIMARY KEY ("site_id", "pack_key")
);

CREATE INDEX "site_block_packs_site_id_enabled_idx"
    ON "site_block_packs"("site_id", "enabled");

ALTER TABLE "site_block_packs" ADD CONSTRAINT "site_block_packs_site_id_fkey"
    FOREIGN KEY ("site_id") REFERENCES "sites"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "site_block_packs" ADD CONSTRAINT "site_block_packs_source_check"
    CHECK ("source" IN ('official', 'external'));

ALTER TABLE "site_block_packs" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "site_block_packs" FORCE ROW LEVEL SECURITY;
CREATE POLICY "site_isolation" ON "site_block_packs"
    USING ("site_id" = NULLIF(current_setting('app.current_site', true), '')::uuid)
    WITH CHECK ("site_id" = NULLIF(current_setting('app.current_site', true), '')::uuid);
