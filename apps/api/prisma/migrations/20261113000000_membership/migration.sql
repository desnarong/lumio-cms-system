-- Reader accounts and paid memberships (docs/PROGRESS.md batch A).
--
-- Readers are the site's own audience, not team members: an account belongs to
-- one site, so the same person can hold separate accounts on two sites. Prices
-- are integer satang, like the shop, and every table is site-scoped with the
-- same RLS policy as content.

ALTER TABLE "contents"
  ADD COLUMN "access" TEXT NOT NULL DEFAULT 'public';

ALTER TABLE "contents" ADD CONSTRAINT "contents_access_check"
  CHECK ("access" IN ('public', 'members'));

CREATE TABLE "readers" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "site_id" UUID NOT NULL,
    "email" TEXT NOT NULL,
    "name" TEXT,
    "password_hash" TEXT NOT NULL,
    "verified_at" TIMESTAMPTZ(6),
    "verify_token_hash" TEXT,
    "verify_expires_at" TIMESTAMPTZ(6),
    "reset_token_hash" TEXT,
    "reset_expires_at" TIMESTAMPTZ(6),
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "readers_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "membership_plans" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "site_id" UUID NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT NOT NULL DEFAULT '',
    "interval" TEXT NOT NULL,
    "price" INTEGER NOT NULL,
    "currency" TEXT NOT NULL DEFAULT 'THB',
    "status" TEXT NOT NULL DEFAULT 'active',
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "membership_plans_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "reader_subscriptions" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "site_id" UUID NOT NULL,
    "reader_id" UUID NOT NULL,
    "plan_id" UUID,
    "status" TEXT NOT NULL DEFAULT 'active',
    "current_period_end" TIMESTAMPTZ(6),
    "cancel_at_period_end" BOOLEAN NOT NULL DEFAULT false,
    "stripe_subscription_id" TEXT,
    "stripe_customer_id" TEXT,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "reader_subscriptions_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "readers_site_id_email_key" ON "readers"("site_id", "email");
CREATE INDEX "readers_site_id_created_at_idx" ON "readers"("site_id", "created_at" DESC);

CREATE INDEX "membership_plans_site_id_status_idx" ON "membership_plans"("site_id", "status");

CREATE UNIQUE INDEX "reader_subscriptions_stripe_subscription_id_key"
    ON "reader_subscriptions"("stripe_subscription_id");
CREATE INDEX "reader_subscriptions_site_id_status_idx"
    ON "reader_subscriptions"("site_id", "status");
CREATE INDEX "reader_subscriptions_reader_id_idx" ON "reader_subscriptions"("reader_id");

ALTER TABLE "readers" ADD CONSTRAINT "readers_site_id_fkey"
    FOREIGN KEY ("site_id") REFERENCES "sites"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "membership_plans" ADD CONSTRAINT "membership_plans_site_id_fkey"
    FOREIGN KEY ("site_id") REFERENCES "sites"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "reader_subscriptions" ADD CONSTRAINT "reader_subscriptions_site_id_fkey"
    FOREIGN KEY ("site_id") REFERENCES "sites"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "reader_subscriptions" ADD CONSTRAINT "reader_subscriptions_reader_id_fkey"
    FOREIGN KEY ("reader_id") REFERENCES "readers"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "reader_subscriptions" ADD CONSTRAINT "reader_subscriptions_plan_id_fkey"
    FOREIGN KEY ("plan_id") REFERENCES "membership_plans"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "membership_plans" ADD CONSTRAINT "membership_plans_interval_check"
    CHECK ("interval" IN ('month', 'year'));
ALTER TABLE "membership_plans" ADD CONSTRAINT "membership_plans_price_check"
    CHECK ("price" >= 0);
ALTER TABLE "membership_plans" ADD CONSTRAINT "membership_plans_status_check"
    CHECK ("status" IN ('active', 'paused'));

ALTER TABLE "reader_subscriptions" ADD CONSTRAINT "reader_subscriptions_status_check"
    CHECK ("status" IN ('active', 'past_due', 'cancelled', 'expired'));

ALTER TABLE "readers" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "readers" FORCE ROW LEVEL SECURITY;
CREATE POLICY "site_isolation" ON "readers"
    USING ("site_id" = NULLIF(current_setting('app.current_site', true), '')::uuid)
    WITH CHECK ("site_id" = NULLIF(current_setting('app.current_site', true), '')::uuid);

ALTER TABLE "membership_plans" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "membership_plans" FORCE ROW LEVEL SECURITY;
CREATE POLICY "site_isolation" ON "membership_plans"
    USING ("site_id" = NULLIF(current_setting('app.current_site', true), '')::uuid)
    WITH CHECK ("site_id" = NULLIF(current_setting('app.current_site', true), '')::uuid);

ALTER TABLE "reader_subscriptions" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "reader_subscriptions" FORCE ROW LEVEL SECURITY;
CREATE POLICY "site_isolation" ON "reader_subscriptions"
    USING ("site_id" = NULLIF(current_setting('app.current_site', true), '')::uuid)
    WITH CHECK ("site_id" = NULLIF(current_setting('app.current_site', true), '')::uuid);
