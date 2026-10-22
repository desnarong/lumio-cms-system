-- Scheduled whole-site backups (docs/design/03-scope.md "Auto Backup",
-- 05-admin-ia.md "Backup & ประวัติเวอร์ชัน"). The exported JSON is stored per
-- site so the owner can download a snapshot taken while they were away; the
-- worker keeps only a short retention window.

CREATE TABLE "site_backups" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "site_id" UUID NOT NULL,
    "filename" TEXT NOT NULL,
    "size_bytes" INTEGER NOT NULL,
    "payload" JSONB NOT NULL,
    "kind" TEXT NOT NULL DEFAULT 'auto',
    "created_by" UUID,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "site_backups_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "site_backups_site_id_created_at_idx"
    ON "site_backups"("site_id", "created_at" DESC);

ALTER TABLE "site_backups" ADD CONSTRAINT "site_backups_site_id_fkey"
    FOREIGN KEY ("site_id") REFERENCES "sites"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "site_backups" ADD CONSTRAINT "site_backups_kind_check"
    CHECK ("kind" IN ('auto', 'manual'));
ALTER TABLE "site_backups" ADD CONSTRAINT "site_backups_size_check"
    CHECK ("size_bytes" >= 0);

ALTER TABLE "site_backups" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "site_backups" FORCE ROW LEVEL SECURITY;
CREATE POLICY "site_isolation" ON "site_backups"
    USING ("site_id" = NULLIF(current_setting('app.current_site', true), '')::uuid)
    WITH CHECK ("site_id" = NULLIF(current_setting('app.current_site', true), '')::uuid);
