-- 404 monitor (docs/design/14-seo-performance.md 14.1). One row per address a
-- visitor asked for that no page answered; the SEO screen uses the biggest ones
-- to suggest redirects.

CREATE TABLE "not_found" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "site_id" UUID NOT NULL,
    "path" TEXT NOT NULL,
    "hits" INTEGER NOT NULL DEFAULT 1,
    "first_seen_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "last_seen_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "not_found_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "not_found_site_id_path_key" ON "not_found"("site_id", "path");
CREATE INDEX "not_found_site_id_last_seen_at_idx"
    ON "not_found"("site_id", "last_seen_at" DESC);

ALTER TABLE "not_found" ADD CONSTRAINT "not_found_site_id_fkey"
    FOREIGN KEY ("site_id") REFERENCES "sites"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "not_found" ADD CONSTRAINT "not_found_hits_check" CHECK ("hits" >= 0);

ALTER TABLE "not_found" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "not_found" FORCE ROW LEVEL SECURITY;
CREATE POLICY "site_isolation" ON "not_found"
    USING ("site_id" = NULLIF(current_setting('app.current_site', true), '')::uuid)
    WITH CHECK ("site_id" = NULLIF(current_setting('app.current_site', true), '')::uuid);
