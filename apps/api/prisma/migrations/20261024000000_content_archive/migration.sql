-- Trash for pages and posts (docs/design/05-admin-ia.md 5.1 "Backup & ประวัติเวอร์ชัน").
--
-- Deleting a page now moves it to the trash: `status` becomes 'archived' and
-- `archived_at` records when, so the purge job can delete it after the retention
-- window and the UI can say how many days are left. The column is nullable, so
-- existing rows and every non-archived row stay valid.

ALTER TABLE "contents" ADD COLUMN "archived_at" TIMESTAMPTZ(6);

-- The trash screen lists one site's archived rows oldest-first; the purge job
-- scans the same shape, so a single index serves both.
CREATE INDEX "contents_site_id_status_archived_at_idx"
    ON "contents"("site_id", "status", "archived_at");
