-- Saved sections (docs/design/07-blocks.md 7.2, block menu "บันทึกเป็นเทมเพลต").
--
-- A section the user saved from the editor: a small block tree they can insert
-- into any page of the same site. It belongs to the site, carries site_id and is
-- isolated under RLS like every other content table.

CREATE TABLE "section_templates" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "site_id" UUID NOT NULL,
    "name" TEXT NOT NULL,
    "blocks" JSONB NOT NULL DEFAULT '[]',
    "created_by" UUID,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "section_templates_pkey" PRIMARY KEY ("id")
);

ALTER TABLE "section_templates"
    ADD CONSTRAINT "section_templates_site_id_fkey"
    FOREIGN KEY ("site_id") REFERENCES "sites"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "section_templates"
    ADD CONSTRAINT "section_templates_created_by_fkey"
    FOREIGN KEY ("created_by") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- The editor shows the newest saved sections first.
CREATE INDEX "section_templates_site_id_created_at_idx"
    ON "section_templates"("site_id", "created_at" DESC);

ALTER TABLE "section_templates" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "section_templates" FORCE ROW LEVEL SECURITY;
CREATE POLICY "site_isolation" ON "section_templates"
    USING ("site_id" = NULLIF(current_setting('app.current_site', true), '')::uuid)
    WITH CHECK ("site_id" = NULLIF(current_setting('app.current_site', true), '')::uuid);