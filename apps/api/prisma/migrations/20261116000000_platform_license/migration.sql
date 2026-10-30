-- The licence pasted in the admin instead of in `.env`
-- (docs/design/24-community-licensing.md 24.10).
--
-- Platform-level like agency_branding: one row describes this installation, not
-- a customer site, so it has no site_id and no RLS policy. `LUMIO_LICENSE`
-- still wins so an operator can override a bad install from the deployment.

CREATE TABLE "platform_license" (
    "id" TEXT NOT NULL DEFAULT 'default',
    "token" TEXT NOT NULL,
    "updated_by" UUID,
    "updated_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "platform_license_pkey" PRIMARY KEY ("id")
);
