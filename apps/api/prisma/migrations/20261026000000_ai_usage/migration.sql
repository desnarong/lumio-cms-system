-- AI assistant usage (docs/design/09-ai-assistant.md 9.6, 11-data-model.md 11.2).
--
-- Every accepted assistant action writes one row. Counting the current month is
-- how the plan's "AI ครั้ง/เดือน" quota is enforced (18-deployment.md 18.6), and
-- the row records which engine answered so real usage can be reviewed later.
-- site_id + RLS keep one site's usage invisible to every other site.

CREATE TABLE "ai_usage" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "site_id" UUID NOT NULL,
    "user_id" UUID,
    "action" TEXT NOT NULL,
    "provider" TEXT NOT NULL,
    "model" TEXT NOT NULL DEFAULT '',
    "items" INTEGER NOT NULL DEFAULT 1,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ai_usage_pkey" PRIMARY KEY ("id")
);

ALTER TABLE "ai_usage"
    ADD CONSTRAINT "ai_usage_site_id_fkey"
    FOREIGN KEY ("site_id") REFERENCES "sites"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "ai_usage"
    ADD CONSTRAINT "ai_usage_action_check"
    CHECK ("action" IN ('rewrite', 'translate', 'alt-text', 'seo'));

ALTER TABLE "ai_usage"
    ADD CONSTRAINT "ai_usage_items_check"
    CHECK ("items" > 0);

-- The quota check counts a site's rows in the current month, newest first.
CREATE INDEX "ai_usage_site_id_created_at_idx"
    ON "ai_usage"("site_id", "created_at" DESC);

ALTER TABLE "ai_usage" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "ai_usage" FORCE ROW LEVEL SECURITY;
CREATE POLICY "site_isolation" ON "ai_usage"
    USING ("site_id" = NULLIF(current_setting('app.current_site', true), '')::uuid)
    WITH CHECK ("site_id" = NULLIF(current_setting('app.current_site', true), '')::uuid);