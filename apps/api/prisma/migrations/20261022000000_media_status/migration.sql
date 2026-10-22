-- Media pipeline state (docs/design/12-api.md 12.6).
--
-- A row is created as 'pending' when the API hands out a presigned upload URL,
-- moves to 'processing' on confirm, then 'ready' once sharp has written the
-- WebP/AVIF ladder. 'failed' keeps a broken upload visible so it can be retried,
-- and 'trashed' is the undo window for DELETE before the files are purged.
--
-- Added nullable-by-default first (a constant default backfills every row), so
-- the migration is safe to run on a table that already holds media.

ALTER TABLE "media" ADD COLUMN "status" TEXT NOT NULL DEFAULT 'pending';

ALTER TABLE "media"
    ADD CONSTRAINT "media_status_check"
    CHECK ("status" IN ('pending', 'processing', 'ready', 'failed', 'trashed'));

-- The library lists newest-first within a site and filters out trashed rows.
CREATE INDEX "media_site_id_status_created_at_idx"
    ON "media"("site_id", "status", "created_at" DESC);