-- Card checkout for shop orders (docs/design/03-scope.md 3.3).
--
-- A Stripe Checkout session is created after the order row exists, so the
-- webhook can find the order by number. `payment_url` lets the buyer reopen the
-- hosted page, and the provider columns keep the session id for auditing.

ALTER TABLE "orders" ADD COLUMN "provider" TEXT;
ALTER TABLE "orders" ADD COLUMN "provider_ref" TEXT;
ALTER TABLE "orders" ADD COLUMN "payment_url" TEXT;

CREATE INDEX "orders_provider_ref_idx" ON "orders"("provider_ref");

-- Card becomes a third payment method on an order.
ALTER TABLE "orders" DROP CONSTRAINT "orders_payment_method_check";
ALTER TABLE "orders" ADD CONSTRAINT "orders_payment_method_check"
    CHECK ("payment_method" IN ('promptpay', 'cod', 'card'));
