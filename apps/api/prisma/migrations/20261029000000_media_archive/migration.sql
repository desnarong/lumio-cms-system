-- Trash for the media library (docs/design/05-admin-ia.md 5.1 "คลังรูป").
--
-- Deleting an image keeps the files on disk so the undo toast still works, and
-- `archived_at` records when it was deleted. The sweep deletes images (and their
-- rendered ladder) once the retention window passes, instead of keeping dead
-- files forever. The column is nullable, so existing and live rows stay valid.

ALTER TABLE "media" ADD COLUMN "archived_at" TIMESTAMPTZ(6);

-- The sweep scans one site's trashed rows oldest-first, so a single index serves it.
CREATE INDEX "media_site_id_status_archived_at_idx"
    ON "media"("site_id", "status", "archived_at");
