-- Card payments renew automatically (docs/design/18-deployment.md 18.7).
--
-- A card upgrade creates a Stripe subscription, so the site keeps the id of its
-- subscription and customer: renewals and cancellations arrive as webhooks that
-- only carry those ids. PromptPay stays a one-time payment, so both columns are
-- nullable and most rows keep them empty.

ALTER TABLE "sites" ADD COLUMN "stripe_customer_id" TEXT;
ALTER TABLE "sites" ADD COLUMN "stripe_subscription_id" TEXT;

-- Renewal invoices look the site up by subscription id.
CREATE INDEX "sites_stripe_subscription_id_idx" ON "sites"("stripe_subscription_id");
