import { useEffect, useMemo, useState } from 'react';
import {
  COLOR_PALETTES,
  THEME_STYLE_PRESETS,
  contrastRatio,
  isAccessiblePrimary,
  localeLabel,
  readableInk,
  type BrandPalette,
  type SiteLocaleStatus,
  type TemplateSummary,
  type WizardSiteResult,
} from '@lumio/shared';
import { Banner, Button, Card, Skeleton, TextField, useT, type MessageKey } from '@lumio/ui';
import { cn } from '@lumio/ui/cn';
import type { AiApi } from '../ai/api.js';
import {
  WIZARD_STEPS,
  buildCreateInput,
  initialDraft as defaultDraft,
  checkStep,
  previewTokens,
  stepIndex,
  subdomainFromName,
  templateForBusinessType,
  withBrandPalette,
  type WizardDraft,
  type WizardStepId,
} from './steps.js';
import type { WizardApi } from './api.js';

const BUSINESS_LABEL_KEYS: Record<WizardDraft['businessType'], MessageKey> = {
  restaurant: 'biz.restaurant',
  clinic: 'biz.clinic',
  freelance: 'biz.freelance',
  shop: 'biz.shop',
  blog: 'biz.blog',
  other: 'biz.other',
};

export interface LogoUpload {
  mediaId: string;
  url: string;
}

export interface WizardPageProps {
  api: WizardApi;
  /** Uploads the logo from step 2; hide the field when this is omitted. */
  uploadLogo?: (file: File) => Promise<LogoUpload>;
  onCreated: (result: WizardSiteResult, draft: WizardDraft) => void;
  /** Extra credit: link straight to the new public site. */
  siteUrlFor?: (result: WizardSiteResult) => string;
  /** Resume on a later step with answers already filled in. */
  initialStepId?: WizardStepId;
  initialAnswers?: Partial<WizardDraft>;
  /** The AI assistant; omit to hide "ให้ผู้ช่วยร่างให้" in step 1. */
  ai?: AiApi;
  /** Reads the brand colours out of the uploaded logo; omit to hide the offer. */
  logoPalette?: (mediaId: string) => Promise<BrandPalette>;
}

type Phase = 'questions' | 'creating' | 'done';

/**
 * Onboarding wizard, five steps in under three minutes
 * (docs/design/04-ux.md 4.1). Step 5 hands the answers to the API, which builds
 * the pages, the menu and the header/footer from the matching template.
 */
export const WizardPage = ({
  api,
  uploadLogo,
  logoPalette,
  onCreated,
  siteUrlFor,
  initialStepId,
  initialAnswers,
  ai,
}: WizardPageProps) => {
  const t = useT();
  const [draft, setDraft] = useState<WizardDraft>(() => ({
    ...defaultDraft(),
    ...initialAnswers,
  }));
  const [templates, setTemplates] = useState<TemplateSummary[] | null>(null);
  const [stepId, setStepId] = useState<WizardStepId>(initialStepId ?? WIZARD_STEPS[0]!.id);
  const [phase, setPhase] = useState<Phase>('questions');
  const [result, setResult] = useState<WizardSiteResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const [logoUrl, setLogoUrl] = useState<string | null>(null);
  const [prompt, setPrompt] = useState('');
  const [aiBusy, setAiBusy] = useState(false);
  const [aiNote, setAiNote] = useState<string | null>(null);
  const [aiError, setAiError] = useState<string | null>(null);
  const [paletteBusy, setPaletteBusy] = useState(false);
  const [paletteNote, setPaletteNote] = useState<string | null>(null);
  const [paletteError, setPaletteError] = useState<string | null>(null);
  const [paletteUndo, setPaletteUndo] = useState<{
    primaryColor: string;
    accentColor: string | null;
  } | null>(null);
  const [localeStatus, setLocaleStatus] = useState<SiteLocaleStatus | null>(null);

  /**
   * "Draft my site from one sentence": the assistant proposes the answers and the
   * user stays in control of every field (docs/design/09-ai-assistant.md 9.1).
   */
  const draftWithAi = async (): Promise<void> => {
    if (!ai || prompt.trim().length < 3) return;
    setAiBusy(true);
    setAiError(null);
    setAiNote(null);
    try {
      const draftSite = await ai.generateSite({ prompt: prompt.trim(), locale: 'th' });
      update({
        businessType: draftSite.businessType,
        name: draftSite.name,
        subdomain: subdomainFromName(draftSite.name),
        styleId: draftSite.styleId as WizardDraft['styleId'],
        primaryColor: draftSite.primaryColor,
        accentColor: draftSite.accentColor,
      });
      setAiNote(
        t('wizard.aiNote', {
          pages: draftSite.pages.map((page) => page.title).join(' · '),
        }),
      );
    } catch (error) {
      setAiError(error instanceof Error ? error.message : t('wizard.error.aiDraft'));
    } finally {
      setAiBusy(false);
    }
  };

  // Templates are only needed to preview the theme; the flow works without them.
  useEffect(() => {
    let active = true;
    void api
      .listTemplates()
      .then((items) => {
        if (active) setTemplates(items);
      })
      .catch(() => {
        if (active) setTemplates([]);
      });
    return () => {
      active = false;
    };
  }, [api]);

  /**
   * The other languages are built in the background (docs/design/17-i18n.md
   * 17.1), so the done screen asks how they are doing until nothing is pending.
   * The editor shows the same pages once they exist, so a failed poll is silent.
   */
  useEffect(() => {
    if (!result) return undefined;

    let active = true;
    let timer: ReturnType<typeof setTimeout> | null = null;

    const poll = async (): Promise<void> => {
      try {
        const status = await api.localeStatus(result.siteId);
        if (!active) return;
        setLocaleStatus(status);
        const busy = status.locales.some(
          (job) => job.status === 'pending' || job.status === 'running',
        );
        if (busy) timer = setTimeout(() => void poll(), 3_000);
      } catch {
        // Keep the screen quiet: the languages keep building on the server.
      }
    };

    void poll();
    return () => {
      active = false;
      if (timer) clearTimeout(timer);
    };
  }, [api, result]);

  const step = WIZARD_STEPS[stepIndex(stepId)]!;
  const isLastQuestion = stepId === 'create';
  const currentIndex = stepIndex(stepId);
  const template = templateForBusinessType(templates ?? [], draft.businessType);
  const preview = useMemo(() => previewTokens(template, draft), [template, draft]);
  const check = checkStep(stepId, draft);

  const update = (patch: Partial<WizardDraft>): void => {
    setDraft((current) => ({ ...current, ...patch }));
    setError(null);
  };

  const goNext = (): void => {
    if (!check.ok) {
      setError(check.messageKey ? t(check.messageKey) : t('wizard.error.incomplete'));
      return;
    }
    const next = WIZARD_STEPS[currentIndex + 1];
    if (next) setStepId(next.id);
  };

  const goBack = (): void => {
    const previous = WIZARD_STEPS[currentIndex - 1];
    if (previous) setStepId(previous.id);
    setError(null);
  };

  const createSite = async (): Promise<void> => {
    setPhase('creating');
    setError(null);
    try {
      const created = await api.createSite(buildCreateInput(draft));
      setResult(created);
      setPhase('done');
    } catch (failure) {
      setError(failure instanceof Error ? failure.message : t('wizard.error.create'));
      setPhase('questions');
    }
  };

  const pickLogo = async (file: File | undefined): Promise<void> => {
    if (!file || !uploadLogo) return;
    setUploading(true);
    setError(null);
    try {
      const uploaded = await uploadLogo(file);
      setLogoUrl(uploaded.url);
      update({ logoMediaId: uploaded.mediaId });
      setPaletteNote(null);
      setPaletteUndo(null);
    } catch (failure) {
      setError(failure instanceof Error ? failure.message : t('wizard.error.logo'));
    } finally {
      setUploading(false);
    }
  };

  /**
   * "Use the colours from my logo": the palette is only a proposal until the
   * owner presses the button, and the previous colours stay one click away
   * (docs/design/04-ux.md 4.1 step 4, 09-ai-assistant.md 9.2).
   */
  const useLogoPalette = async (): Promise<void> => {
    if (!logoPalette || !draft.logoMediaId) return;

    const previous = { primaryColor: draft.primaryColor, accentColor: draft.accentColor };
    setPaletteBusy(true);
    setPaletteError(null);
    try {
      const palette = await logoPalette(draft.logoMediaId);
      update(withBrandPalette(draft, palette));
      setPaletteNote(
        t('wizard.logoPaletteNote', { primary: palette.primary, accent: palette.accent }),
      );
      setPaletteUndo(previous);
    } catch (failure) {
      setPaletteError(
        failure instanceof Error ? failure.message : t('wizard.logoPaletteError'),
      );
      setPaletteNote(null);
    } finally {
      setPaletteBusy(false);
    }
  };

  const undoLogoPalette = (): void => {
    if (!paletteUndo) return;
    update(paletteUndo);
    setPaletteUndo(null);
    setPaletteNote(null);
  };

  if (phase === 'done' && result) {
    return (
      <div className="wizard-shell">
        <Card className="wizard-card">
          <p className="wizard-eyebrow">{t('wizard.done')}</p>
          <h1 className="wizard-title">{t('wizard.doneTitle', { name: result.name })}</h1>
          <p className="wizard-subtitle">
            {t('wizard.doneBody', { count: result.pages.length })}
            {result.published > 0 ? t('wizard.donePublished') : ''}
          </p>

          {localeStatus && localeStatus.locales.length > 0 ? (
            <ul
              className="wizard-locales-status"
              aria-live="polite"
              aria-label={t('wizard.localesTitle')}
            >
              {localeStatus.locales.map((job) => (
                <li className="wizard-locales-status__item" key={job.locale}>
                  {job.status === 'failed'
                    ? t('wizard.localeFailed', { locale: localeLabel(job.locale) })
                    : job.status === 'done'
                      ? job.translated
                        ? t('wizard.localeDone', { locale: localeLabel(job.locale) })
                        : t('wizard.localeCopied', { locale: localeLabel(job.locale) })
                      : t('wizard.localeBuilding', { locale: localeLabel(job.locale) })}
                </li>
              ))}
            </ul>
          ) : null}

          <ul className="wizard-pages">
            {result.pages.map((page) => (
              <li className="wizard-pages__item" key={page.id}>
                <span className="wizard-pages__title">{page.title}</span>
                <span className="wizard-pages__path">/{page.slug === 'home' ? '' : page.slug}</span>
              </li>
            ))}
          </ul>

          {siteUrlFor ? (
            <a className="wizard-site-link" href={siteUrlFor(result)}>
              {t('wizard.openSite')}
            </a>
          ) : null}

          <div className="wizard-actions">
            <Button size="lg" onClick={() => onCreated(result, draft)}>
              {t('wizard.startEditing')}
            </Button>
          </div>
        </Card>
      </div>
    );
  }

  return (
    <div className="wizard-shell">
      <Card className="wizard-card">
        <ol className="wizard-steps" aria-label={t('wizard.stepsLabel')}>
          {WIZARD_STEPS.map((item, index) => (
            <li
              key={item.id}
              className={cn(
                'wizard-steps__item',
                index === currentIndex && 'is-current',
                index < currentIndex && 'is-done',
              )}
              aria-current={index === currentIndex ? 'step' : undefined}
            >
              <span className="wizard-steps__number" aria-hidden="true">
                {index < currentIndex ? '✓' : index + 1}
              </span>
              <span className="wizard-steps__title">{t(item.titleKey)}</span>
            </li>
          ))}
        </ol>

        <div className="wizard-head">
          <p className="wizard-eyebrow">
            {t('wizard.stepOf', { step: currentIndex + 1, total: WIZARD_STEPS.length })}
          </p>
          <h1 className="wizard-title">{t(step.titleKey)}</h1>
          <p className="wizard-subtitle">{t(step.hintKey)}</p>
        </div>

        {error ? <Banner tone="danger" title={error} /> : null}

        {phase === 'creating' ? (
          <div className="wizard-creating" aria-busy="true">
            <Skeleton shape="block" height={140} />
            <p className="wizard-subtitle">{t('wizard.creatingBody')}</p>
          </div>
        ) : (
          <div className="wizard-body">
            {stepId === 'business' ? (
              <div className="wizard-stack">
                {ai ? (
                  <Card className="wizard-ai-draft">
                    <TextField
                      label={t('wizard.aiPromptLabel')}
                      value={prompt}
                      placeholder={t('wizard.aiPromptPlaceholder')}
                      hint={t('wizard.aiPromptHint')}
                      onChange={(event) => setPrompt(event.target.value)}
                    />
                    <div className="wizard-actions">
                      <Button
                        variant="secondary"
                        disabled={aiBusy || prompt.trim().length < 3}
                        onClick={() => void draftWithAi()}
                      >
                        {aiBusy ? t('wizard.aiBusy') : t('wizard.aiDraft')}
                      </Button>
                    </div>
                    {aiNote ? <p className="wizard-subtitle">{aiNote}</p> : null}
                    {aiError ? (
                      <p className="wizard-error" role="alert">
                        {aiError}
                      </p>
                    ) : null}
                  </Card>
                ) : null}

                <div className="wizard-grid wizard-grid--business">
                  {Object.entries(BUSINESS_LABEL_KEYS).map(([value, labelKey]) => (
                    <button
                      key={value}
                      type="button"
                      className={cn('wizard-option', draft.businessType === value && 'is-selected')}
                      aria-pressed={draft.businessType === value}
                      onClick={() =>
                        update({
                          businessType: value as WizardDraft['businessType'],
                          styleId:
                            templateForBusinessType(
                              templates ?? [],
                              value as WizardDraft['businessType'],
                            )?.styleId ?? draft.styleId,
                        })
                      }
                    >
                      <span className="wizard-option__label">{t(labelKey)}</span>
                    </button>
                  ))}
                </div>
              </div>
            ) : null}

            {stepId === 'name' ? (
              <div className="wizard-fields">
                <TextField
                  id="wizard-name"
                  label={t('wizard.nameLabel')}
                  hint={t('wizard.nameHint')}
                  value={draft.name}
                  onChange={(event) =>
                    update({
                      name: event.target.value,
                      subdomain:
                        draft.subdomain.length === 0 || draft.subdomain === subdomainFromName(draft.name)
                          ? subdomainFromName(event.target.value)
                          : draft.subdomain,
                    })
                  }
                />
                <TextField
                  id="wizard-subdomain"
                  label={t('wizard.subdomainLabel')}
                  hint={t('wizard.subdomainHint')}
                  value={draft.subdomain}
                  onChange={(event) =>
                    update({ subdomain: event.target.value.trim().toLowerCase() })
                  }
                />
                {uploadLogo ? (
                  <div className="wizard-logo">
                    <label className="wizard-logo__label" htmlFor="wizard-logo">
                      {t('wizard.logo')}
                    </label>
                    <input
                      id="wizard-logo"
                      type="file"
                      accept="image/png,image/jpeg,image/webp,image/avif,image/gif"
                      disabled={uploading}
                      onChange={(event) => void pickLogo(event.target.files?.[0])}
                    />
                    {logoUrl ? (
                      <span className="wizard-logo__preview">
                        <img src={logoUrl} alt={t('wizard.logoAlt')} height={48} />
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => {
                            setLogoUrl(null);
                            update({ logoMediaId: null });
                          }}
                        >
                          {t('wizard.logoRemove')}
                        </Button>
                      </span>
                    ) : (
                      <p className="wizard-subtitle">
                        {uploading ? t('wizard.logoUploading') : t('wizard.logoSkip')}
                      </p>
                    )}
                  </div>
                ) : null}
              </div>
            ) : null}

            {stepId === 'style' ? (
              <div className="wizard-grid wizard-grid--style">
                {THEME_STYLE_PRESETS.map((preset) => (
                  <button
                    key={preset.id}
                    type="button"
                    className={cn('wizard-option', 'wizard-option--style', draft.styleId === preset.id && 'is-selected')}
                    aria-pressed={draft.styleId === preset.id}
                    onClick={() => update({ styleId: preset.id })}
                  >
                    <span
                      className="wizard-option__swatch"
                      style={{
                        borderRadius: 'var(--radius-md)',
                        background: `linear-gradient(135deg, ${draft.primaryColor}, ${draft.accentColor ?? '#F472B6'})`,
                      }}
                      aria-hidden="true"
                    />
                    <span className="wizard-option__label">{preset.label}</span>
                    <span className="wizard-option__hint">{preset.description}</span>
                  </button>
                ))}
              </div>
            ) : null}

            {stepId === 'color' ? (
              <div className="wizard-colors">
                {logoPalette && draft.logoMediaId ? (
                  <div className="wizard-logo-palette">
                    <div className="wizard-logo-palette__text">
                      <p className="wizard-logo__label">{t('wizard.logoPaletteTitle')}</p>
                      <p className="wizard-subtitle">{t('wizard.logoPaletteHint')}</p>
                    </div>
                    <div className="wizard-logo-palette__actions">
                      <Button
                        size="sm"
                        variant="secondary"
                        disabled={paletteBusy}
                        onClick={() => void useLogoPalette()}
                      >
                        {paletteBusy ? t('wizard.logoPaletteBusy') : t('wizard.logoPaletteAction')}
                      </Button>
                      {paletteUndo ? (
                        <Button size="sm" variant="ghost" onClick={undoLogoPalette}>
                          {t('wizard.logoPaletteUndo')}
                        </Button>
                      ) : null}
                    </div>
                  </div>
                ) : null}

                {paletteNote ? (
                  <p className="wizard-subtitle" role="status">
                    {paletteNote}
                  </p>
                ) : null}

                {paletteError ? (
                  <p className="wizard-subtitle" role="alert">
                    {paletteError}
                  </p>
                ) : null}

                <div className="wizard-grid wizard-grid--palette">
                  {COLOR_PALETTES.map((palette) => (
                    <button
                      key={palette.id}
                      type="button"
                      className={cn(
                        'wizard-swatch',
                        draft.primaryColor === palette.primary && 'is-selected',
                      )}
                      aria-pressed={draft.primaryColor === palette.primary}
                      title={palette.label}
                      onClick={() =>
                        update({ primaryColor: palette.primary, accentColor: palette.accent })
                      }
                    >
                      <span
                        className="wizard-swatch__primary"
                        style={{ background: palette.primary }}
                        aria-hidden="true"
                      />
                      <span
                        className="wizard-swatch__accent"
                        style={{ background: palette.accent }}
                        aria-hidden="true"
                      />
                      <span className="wizard-swatch__label">{palette.label}</span>
                    </button>
                  ))}
                </div>

                <div className="wizard-color-custom">
                  <label className="wizard-logo__label" htmlFor="wizard-color">
                    {t('wizard.customColor')}
                  </label>
                  <input
                    id="wizard-color"
                    type="color"
                    value={draft.primaryColor}
                    onChange={(event) => update({ primaryColor: event.target.value.toUpperCase() })}
                  />
                  <p className="wizard-subtitle">{t('wizard.pickedColor', { color: draft.primaryColor })}</p>
                </div>

                <Banner
                  tone={isAccessiblePrimary(draft.primaryColor) ? 'success' : 'warning'}
                  title={
                    isAccessiblePrimary(draft.primaryColor)
                      ? t('wizard.contrastOk')
                      : t('wizard.contrastBad')
                  }
                >
                  {t('wizard.contrastRatio', {
                    ratio: contrastRatio(
                      draft.primaryColor,
                      readableInk(draft.primaryColor),
                    ).toFixed(1),
                  })}
                </Banner>
              </div>
            ) : null}

            {isLastQuestion ? (
              <div className="wizard-locales">
                <p className="wizard-logo__label">{t('wizard.localesTitle')}</p>
                <p className="wizard-subtitle">{t('wizard.localesHint')}</p>
                <label className="wizard-locale-option">
                  <input
                    type="checkbox"
                    checked={draft.extraLocales.includes('en')}
                    onChange={(event) =>
                      update({
                        extraLocales: event.target.checked
                          ? [...new Set([...draft.extraLocales, 'en'])]
                          : draft.extraLocales.filter((locale) => locale !== 'en'),
                      })
                    }
                  />
                  <span>{t('wizard.localeEn')}</span>
                </label>
              </div>
            ) : null}

            {isLastQuestion ? (
              <div className="wizard-summary">
                {template?.previewUrl ? (
                  <img
                    className="wizard-summary__preview"
                    src={template.previewUrl}
                    alt={t('wizard.templateAlt', { name: template.name })}
                    loading="lazy"
                    decoding="async"
                  />
                ) : null}
                <ul className="wizard-summary__list">
                  <li>
                    {t('wizard.summary.business')}{' '}
                    <strong>{t(BUSINESS_LABEL_KEYS[draft.businessType])}</strong>
                  </li>
                  <li>
                    {t('wizard.summary.name')}{' '}
                    <strong>{draft.name || t('wizard.summary.unnamed')}</strong>
                  </li>
                  <li>
                    {t('wizard.summary.subdomain')} <strong>{draft.subdomain}</strong>
                  </li>
                  <li>
                    {t('wizard.summary.template')}{' '}
                    <strong>{template?.name ?? t('wizard.summary.loading')}</strong>
                  </li>
                  <li>
                    {t('wizard.summary.languages')}{' '}
                    <strong>
                      {[localeLabel('th'), ...draft.extraLocales.map((locale) => localeLabel(locale))].join(
                        ' · ',
                      )}
                    </strong>
                  </li>
                  <li>
                    {t('wizard.summary.pages')}{' '}
                    <strong>
                      {template
                        ? t('wizard.summary.pageCount', { count: template.pages.length })
                        : t('wizard.summary.fivePages')}
                    </strong>
                  </li>
                </ul>
                <div className="wizard-preview" style={{ background: preview.colors.primary }}>
                  <span className="wizard-preview__button" style={{ color: readableInk(preview.colors.primary) }}>
                    {t('wizard.previewButton')}
                  </span>
                </div>
              </div>
            ) : null}
          </div>
        )}

        <div className="wizard-actions">
          {currentIndex > 0 ? (
            <Button variant="ghost" onClick={goBack} disabled={phase === 'creating'}>
              {t('wizard.back')}
            </Button>
          ) : null}
          {isLastQuestion ? (
            <Button size="lg" disabled={phase === 'creating'} onClick={() => void createSite()}>
              {t('wizard.createNow')}
            </Button>
          ) : (
            <Button size="lg" onClick={goNext}>
              {t('wizard.next')}
            </Button>
          )}
        </div>
      </Card>
    </div>
  );
};
