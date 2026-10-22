-- Payment gateway references for invoices (docs/design/18-deployment.md 18.7).
--
-- The owner pays through Stripe Checkout (card or PromptPay): the invoice row is
-- created first as `pending`, the Stripe session id is stored on it, and the
-- webhook marks the same row `paid` once Stripe confirms. The columns are
-- nullable so invoices issued before the gateway keep working.

ALTER TABLE "invoices" ADD COLUMN "provider" TEXT;
ALTER TABLE "invoices" ADD COLUMN "provider_ref" TEXT;
ALTER TABLE "invoices" ADD COLUMN "method" TEXT;

-- The webhook looks an invoice up by the session id it was created with.
CREATE INDEX "invoices_provider_ref_idx" ON "invoices"("provider_ref");
