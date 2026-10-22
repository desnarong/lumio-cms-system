-- Languages of a page (docs/design/17-i18n.md 17.2).
--
-- A page in another language is a separate row, and every language of the same
-- page shares one `translation_group_id`. The column stays nullable so existing
-- rows are valid: a page with no translations is simply its own group (the API
-- falls back to the row's own id), and rows only link up when a translation is
-- created. `UNIQUE (site_id, locale, type, slug)` is unchanged, so a slug may
-- repeat across languages as the design requires.

ALTER TABLE "contents" ADD COLUMN "translation_group_id" UUID;

-- The admin language switcher reads every language of one page, so the index
-- leads with the group and then the locale.
CREATE INDEX "contents_translation_group_id_locale_idx"
    ON "contents"("translation_group_id", "locale");