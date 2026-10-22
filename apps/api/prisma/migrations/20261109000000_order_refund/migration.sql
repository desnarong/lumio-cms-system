-- Refunds for shop orders (docs/design/03-scope.md 3.3).
--
-- A refund keeps the money trail on the order itself: how much went back, when,
-- why, and the provider reference when Stripe issued it. The status becomes
-- `refunded` so the list and the receipt no longer claim the order was paid.

ALTER TABLE "orders" ADD COLUMN "refunded_amount" INTEGER NOT NULL DEFAULT 0;
ALTER TABLE "orders" ADD COLUMN "refunded_at" TIMESTAMPTZ(6);
ALTER TABLE "orders" ADD COLUMN "refund_reason" TEXT NOT NULL DEFAULT '';
ALTER TABLE "orders" ADD COLUMN "refund_ref" TEXT;

ALTER TABLE "orders" DROP CONSTRAINT "orders_status_check";
ALTER TABLE "orders" ADD CONSTRAINT "orders_status_check"
    CHECK ("status" IN ('pending', 'paid', 'shipped', 'completed', 'cancelled', 'refunded'));

ALTER TABLE "orders" ADD CONSTRAINT "orders_refunded_amount_check"
    CHECK ("refunded_amount" >= 0 AND "refunded_amount" <= "total");
