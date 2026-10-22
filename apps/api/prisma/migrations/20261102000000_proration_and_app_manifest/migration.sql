-- Proration credit and externally hosted App manifests (docs/design/18-deployment.md
-- 18.6-18.7, 16-apps.md).
--
-- An invoice records how much of the previous plan's unused time was taken off the
-- charge, so the history explains why the amount is lower than the plan price.
-- Non-negative by default so every row issued before proration existed stays valid.

ALTER TABLE "invoices" ADD COLUMN "credit" INTEGER NOT NULL DEFAULT 0;

-- Apps used to come only from the in-code catalog. A developer can now host a
-- manifest; the site keeps the URL it came from and the validated manifest, so
-- the sandbox, the permission list and the bridge scope checks survive a reload
-- without trusting the browser. Catalog Apps keep `source = 'catalog'`.

ALTER TABLE "site_apps" ADD COLUMN "source" TEXT NOT NULL DEFAULT 'catalog';
ALTER TABLE "site_apps" ADD COLUMN "manifest_url" TEXT;
ALTER TABLE "site_apps" ADD COLUMN "manifest" JSONB;
