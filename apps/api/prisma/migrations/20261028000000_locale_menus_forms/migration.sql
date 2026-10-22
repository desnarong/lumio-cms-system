-- Per-language navigation and forms (docs/design/17-i18n.md 17.5).
--
-- Both columns stay nullable on purpose: NULL means "this row serves every
-- language", which is exactly how menus and forms behaved before multi-language
-- sites existed. Nothing has to be backfilled, and a site that offers one
-- language keeps one row per menu/form.
--
-- `menus` also swaps its unique key: Prisma cannot express "unique among the
-- rows where locale IS NULL", so the general menu is guarded by a partial index
-- and language-specific rows by the three-column unique index.

ALTER TABLE "menus" ADD COLUMN "locale" TEXT;
ALTER TABLE "forms" ADD COLUMN "locale" TEXT;
ALTER TABLE "forms" ADD COLUMN "translation_group_id" UUID;

DROP INDEX "menus_site_id_location_key";

CREATE UNIQUE INDEX "menus_site_id_location_locale_key"
    ON "menus"("site_id", "location", "locale");

-- Postgres treats NULLs as distinct, so this is what actually keeps one shared
-- menu per location.
CREATE UNIQUE INDEX "menus_site_location_general_key"
    ON "menus"("site_id", "location")
    WHERE "locale" IS NULL;

CREATE UNIQUE INDEX "forms_site_id_translation_group_id_locale_key"
    ON "forms"("site_id", "translation_group_id", "locale");