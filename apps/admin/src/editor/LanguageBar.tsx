import { useCallback, useEffect, useState } from 'react';
import {
  LOCALE_LABELS,
  localeLabel,
  SUPPORTED_LOCALES,
  type ContentTranslationLink,
  type ContentTranslations,
  type TranslateContentResult,
} from '@lumio/shared';
import { Button, Modal, Select, TextField, useT, type MessageKey } from '@lumio/ui';
import { cn } from '@lumio/ui/cn';
import type { ContentApi } from './api.js';

const STATUS_LABELS: Record<string, MessageKey> = {
  draft: 'editor.lang.statusDraft',
  scheduled: 'editor.lang.statusScheduled',
  published: 'editor.lang.statusPublished',
  archived: 'editor.lang.statusArchived',
};

const LANGUAGE_OPTIONS = SUPPORTED_LOCALES.map((locale) => ({
  value: locale,
  label: LOCALE_LABELS[locale],
}));

export interface LanguageBarViewProps {
  translations: ContentTranslations;
  contentId: string;
  /** Locale currently being created, or null when the dialog is closed. */
  creating: string | null;
  title: string;
  slug: string;
  translate: boolean;
  busy: boolean;
  /** True when this page is not in the site's main language, so text can be translated. */
  showTranslate: boolean;
  translating: boolean;
  /** Asks the assistant to translate the copy that is still in the source language. */
  onTranslate: () => void;
  /** Opens an existing language, or starts a new translation for a missing one. */
  onOpenLanguage: (item: ContentTranslationLink) => void;
  onLocaleChange: (locale: string) => void;
  onTitleChange: (value: string) => void;
  onSlugChange: (value: string) => void;
  onTranslateChange: (value: boolean) => void;
  onCloseDialog: () => void;
  onSubmit: () => void;
}

/**
 * Presentational language switcher (docs/design/17-i18n.md 17.3): a badge per
 * language showing its state, and a dialog that creates a missing translation
 * from the current page's structure.
 */
export const LanguageBarView = ({
  translations,
  contentId,
  creating,
  title,
  slug,
  translate,
  busy,
  showTranslate,
  translating,
  onTranslate,
  onOpenLanguage,
  onLocaleChange,
  onTitleChange,
  onSlugChange,
  onTranslateChange,
  onCloseDialog,
  onSubmit,
}: LanguageBarViewProps) => {
  const t = useT();

  return (
    <div className="editor-language">
      <span className="editor-language__label">{t('editor.lang.label')}</span>
      <div className="editor-language__items" role="group" aria-label={t('editor.lang.group')}>
        {translations.items.map((item) => {
          const active = item.contentId === contentId;
          return (
            <button
              key={item.locale}
              type="button"
              className={cn('editor-language__badge', active && 'editor-language__badge--active')}
              aria-pressed={active}
              disabled={active}
              onClick={() => onOpenLanguage(item)}
              title={
                item.exists
                  ? `${localeLabel(item.locale)} · ${
                      t(STATUS_LABELS[item.status ?? 'draft'] ?? 'editor.lang.statusDraft')
                    }`
                  : t('editor.lang.missingHint', { language: localeLabel(item.locale) })
              }
              data-state={item.exists ? 'exists' : 'missing'}
            >
              {localeLabel(item.locale)}
              <span className="editor-language__state">
                {item.exists
                  ? t(STATUS_LABELS[item.status ?? 'draft'] ?? 'editor.lang.statusDraft')
                  : t('editor.lang.missing')}
              </span>
            </button>
          );
        })}
      </div>

      {showTranslate ? (
        <Button
          variant="secondary"
          size="sm"
          className="editor-language__translate"
          onClick={onTranslate}
          disabled={translating}
        >
          {translating ? t('editor.lang.translating') : t('editor.lang.translate')}
        </Button>
      ) : null}

      {creating ? (
        <Modal
          open
          size="sm"
          title={t('editor.lang.createTitle', { language: localeLabel(creating) })}
          description={t('editor.lang.createBody')}
          onClose={onCloseDialog}
          footer={
            <div className="editor-modal-actions">
              <Button variant="ghost" onClick={onCloseDialog}>
                {t('common.cancel')}
              </Button>
              <Button onClick={onSubmit} disabled={busy}>
                {busy ? t('editor.lang.creating') : t('editor.lang.create')}
              </Button>
            </div>
          }
        >
          <div className="editor-language__form">
            <Select
              label={t('editor.lang.language')}
              value={creating}
              options={LANGUAGE_OPTIONS}
              onChange={(event) => onLocaleChange(event.target.value)}
            />
            <TextField
              id="translation-title"
              label={t('editor.lang.title')}
              value={title}
              onChange={(event) => onTitleChange(event.target.value)}
            />
            <TextField
              id="translation-slug"
              label={t('editor.lang.slug')}
              hint={t('editor.lang.slugHint')}
              value={slug}
              onChange={(event) => onSlugChange(event.target.value)}
            />
            <Select
              label={t('editor.lang.translateWithAi')}
              value={translate ? 'yes' : 'no'}
              options={[
                { value: 'no', label: t('editor.lang.translateNo') },
                { value: 'yes', label: t('editor.lang.translateYes') },
              ]}
              onChange={(event) => onTranslateChange(event.target.value === 'yes')}
            />
          </div>
        </Modal>
      ) : null}
    </div>
  );
};

export interface LanguageBarProps {
  api: ContentApi;
  contentId: string;
  /** Opens another language of the page; omit to list languages read-only. */
  onSwitch?: (contentId: string) => void;
  /** Notifies the shell after a translation is created. */
  onCreated?: (contentId: string) => void;
  /** Receives the translated copy so the editor can apply it as one undo step. */
  onTranslated?: (result: TranslateContentResult) => void;
  onError?: (message: string) => void;
}

/** Loads the page's languages and answers with {@link LanguageBarView}. */
export const LanguageBar = ({
  api,
  contentId,
  onSwitch,
  onCreated,
  onTranslated,
  onError,
}: LanguageBarProps) => {
  const t = useT();
  const [translations, setTranslations] = useState<ContentTranslations | null>(null);
  const [creating, setCreating] = useState<string | null>(null);
  const [slug, setSlug] = useState('home');
  const [title, setTitle] = useState('');
  const [translate, setTranslate] = useState(false);
  const [busy, setBusy] = useState(false);
  const [translating, setTranslating] = useState(false);

  const reload = useCallback(async () => {
    try {
      setTranslations(await api.translations(contentId));
    } catch {
      // A missing switcher must never block editing.
      setTranslations(null);
    }
  }, [api, contentId]);

  useEffect(() => {
    void reload();
  }, [reload]);

  if (!translations || translations.items.length < 2) return null;

  const activeLocale =
    translations.items.find((item) => item.contentId === contentId)?.locale ?? null;
  const showTranslate = activeLocale !== null && activeLocale !== translations.defaultLocale;

  const openLanguage = (item: ContentTranslationLink): void => {
    if (item.contentId && onSwitch) {
      onSwitch(item.contentId);
      return;
    }
    if (item.exists) return;

    const current = translations.items.find((entry) => entry.contentId === contentId);
    setTitle(current?.title ?? '');
    setSlug(current?.slug ?? 'home');
    setTranslate(false);
    setCreating(item.locale);
  };

  const submit = async (): Promise<void> => {
    if (!creating) return;
    setBusy(true);
    try {
      const created = await api.createTranslation(contentId, {
        locale: creating,
        ...(slug.trim() ? { slug: slug.trim() } : {}),
        ...(title.trim() ? { title: title.trim() } : {}),
        translate,
      });
      setCreating(null);
      onCreated?.(created.id);
      if (onSwitch) onSwitch(created.id);
      else void reload();
    } catch (error) {
      onError?.(error instanceof Error ? error.message : t('editor.lang.createError'));
    } finally {
      setBusy(false);
    }
  };

  const translateRemaining = async (): Promise<void> => {
    setTranslating(true);
    try {
      const result = await api.translateContent(contentId, { onlyMissing: true });
      onTranslated?.(result);
    } catch (error) {
      onError?.(error instanceof Error ? error.message : t('editor.lang.translateError'));
    } finally {
      setTranslating(false);
    }
  };

  return (
    <LanguageBarView
      translations={translations}
      contentId={contentId}
      creating={creating}
      title={title}
      slug={slug}
      translate={translate}
      busy={busy}
      showTranslate={showTranslate}
      translating={translating}
      onTranslate={() => void translateRemaining()}
      onOpenLanguage={openLanguage}
      onLocaleChange={setCreating}
      onTitleChange={setTitle}
      onSlugChange={setSlug}
      onTranslateChange={setTranslate}
      onCloseDialog={() => setCreating(null)}
      onSubmit={() => void submit()}
    />
  );
};
