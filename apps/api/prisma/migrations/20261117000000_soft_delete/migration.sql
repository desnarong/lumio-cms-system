-- Soft delete for records whose delete must be undoable (AGENTS.md rule 5):
-- deleting sets deleted_at, restoring clears it, and the worker purges rows
-- that stayed deleted past the trash window. Existing RLS policies cover the
-- new column, so nothing else changes.

ALTER TABLE "promotions" ADD COLUMN "deleted_at" TIMESTAMPTZ(6);
ALTER TABLE "booking_services" ADD COLUMN "deleted_at" TIMESTAMPTZ(6);
ALTER TABLE "forms" ADD COLUMN "deleted_at" TIMESTAMPTZ(6);
ALTER TABLE "membership_plans" ADD COLUMN "deleted_at" TIMESTAMPTZ(6);

CREATE INDEX "promotions_site_id_deleted_at_idx" ON "promotions"("site_id", "deleted_at");
CREATE INDEX "booking_services_site_id_deleted_at_idx" ON "booking_services"("site_id", "deleted_at");
CREATE INDEX "forms_site_id_deleted_at_idx" ON "forms"("site_id", "deleted_at");
CREATE INDEX "membership_plans_site_id_deleted_at_idx" ON "membership_plans"("site_id", "deleted_at");
