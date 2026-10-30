-- Public API keys, appointment booking and white-label branding
-- (docs/PROGRESS.md "งานนอก MVP").
--
-- api_keys, booking_services and bookings are site data, so they carry
-- site_id and the same FORCE RLS policy as content. agency_branding is
-- platform-level: it describes this installation, not a customer site, so it
-- deliberately has no site_id and no RLS policy.

CREATE TABLE "api_keys" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "site_id" UUID NOT NULL,
    "name" TEXT NOT NULL,
    "hint" TEXT NOT NULL,
    "key_hash" TEXT NOT NULL,
    "scopes" TEXT[] NOT NULL DEFAULT ARRAY['content:read']::TEXT[],
    "last_used_at" TIMESTAMPTZ(6),
    "revoked_at" TIMESTAMPTZ(6),
    "created_by" UUID,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "api_keys_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "api_keys_key_hash_key" ON "api_keys"("key_hash");
CREATE INDEX "api_keys_site_id_revoked_at_idx" ON "api_keys"("site_id", "revoked_at");

ALTER TABLE "api_keys" ADD CONSTRAINT "api_keys_site_id_fkey"
    FOREIGN KEY ("site_id") REFERENCES "sites"("id") ON DELETE CASCADE ON UPDATE CASCADE;

CREATE TABLE "booking_services" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "site_id" UUID NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT NOT NULL DEFAULT '',
    "duration_minutes" INTEGER NOT NULL DEFAULT 60,
    "price" INTEGER NOT NULL DEFAULT 0,
    "currency" TEXT NOT NULL DEFAULT 'THB',
    "active" BOOLEAN NOT NULL DEFAULT true,
    "sort" INTEGER NOT NULL DEFAULT 0,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "booking_services_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "booking_services_site_id_active_sort_idx"
    ON "booking_services"("site_id", "active", "sort");

ALTER TABLE "booking_services" ADD CONSTRAINT "booking_services_site_id_fkey"
    FOREIGN KEY ("site_id") REFERENCES "sites"("id") ON DELETE CASCADE ON UPDATE CASCADE;

CREATE TABLE "bookings" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "site_id" UUID NOT NULL,
    "service_id" UUID,
    "service_name" TEXT NOT NULL,
    "customer_name" TEXT NOT NULL,
    "customer_email" TEXT,
    "customer_phone" TEXT,
    "note" TEXT NOT NULL DEFAULT '',
    "starts_at" TIMESTAMPTZ(6) NOT NULL,
    "ends_at" TIMESTAMPTZ(6) NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'pending',
    "cancel_hash" TEXT,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "bookings_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "bookings_status_check"
        CHECK ("status" IN ('pending', 'confirmed', 'completed', 'cancelled', 'no_show'))
);

CREATE UNIQUE INDEX "bookings_cancel_hash_key" ON "bookings"("cancel_hash");
CREATE INDEX "bookings_site_id_starts_at_idx" ON "bookings"("site_id", "starts_at");
CREATE INDEX "bookings_site_id_status_starts_at_idx"
    ON "bookings"("site_id", "status", "starts_at");

ALTER TABLE "bookings" ADD CONSTRAINT "bookings_site_id_fkey"
    FOREIGN KEY ("site_id") REFERENCES "sites"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "bookings" ADD CONSTRAINT "bookings_service_id_fkey"
    FOREIGN KEY ("service_id") REFERENCES "booking_services"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "api_keys" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "api_keys" FORCE ROW LEVEL SECURITY;
CREATE POLICY "site_isolation" ON "api_keys"
    USING ("site_id" = NULLIF(current_setting('app.current_site', true), '')::uuid)
    WITH CHECK ("site_id" = NULLIF(current_setting('app.current_site', true), '')::uuid);

ALTER TABLE "booking_services" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "booking_services" FORCE ROW LEVEL SECURITY;
CREATE POLICY "site_isolation" ON "booking_services"
    USING ("site_id" = NULLIF(current_setting('app.current_site', true), '')::uuid)
    WITH CHECK ("site_id" = NULLIF(current_setting('app.current_site', true), '')::uuid);

ALTER TABLE "bookings" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "bookings" FORCE ROW LEVEL SECURITY;
CREATE POLICY "site_isolation" ON "bookings"
    USING ("site_id" = NULLIF(current_setting('app.current_site', true), '')::uuid)
    WITH CHECK ("site_id" = NULLIF(current_setting('app.current_site', true), '')::uuid);

CREATE TABLE "agency_branding" (
    "id" TEXT NOT NULL DEFAULT 'default',
    "brand_name" TEXT NOT NULL DEFAULT 'Lumio',
    "logo_url" TEXT,
    "support_email" TEXT,
    "hide_branding" BOOLEAN NOT NULL DEFAULT false,
    "accent_color" TEXT,
    "updated_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "agency_branding_pkey" PRIMARY KEY ("id")
);
