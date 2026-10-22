import type { CSSProperties } from 'react';
import {
  THEME_ANIMATIONS,
  THEME_BUTTON_STYLES,
  THEME_COLOR_MODES,
  THEME_DENSITIES,
  THEME_RADIUS_SCALES,
  isAccessiblePrimary,
  themeCssVariables,
  type ThemeTokensPatch,
} from '@lumio/shared';
import { Button, ColorPicker, EmptyState, Select, Skeleton, useT, type MessageKey } from '@lumio/ui';
import type { DesignTokensController } from './hooks.js';

const FONT_OPTIONS = [
  'Noto Sans Thai',
  'IBM Plex Sans Thai',
  'Prompt',
  'Kanit',
  'Inter',
  'Plus Jakarta Sans',
].map((font) => ({ value: font, label: font }));

const RADIUS_LABEL_KEYS: Record<(typeof THEME_RADIUS_SCALES)[number], MessageKey> = {
  none: 'theme.radius.none',
  sm: 'theme.radius.sm',
  md: 'theme.radius.md',
  lg: 'theme.radius.lg',
  xl: 'theme.radius.xl',
  full: 'theme.radius.full',
};

const BUTTON_LABEL_KEYS: Record<(typeof THEME_BUTTON_STYLES)[number], MessageKey> = {
  solid: 'theme.button.solid',
  outline: 'theme.button.outline',
  soft: 'theme.button.soft',
  gradient: 'theme.button.gradient',
};

const DENSITY_LABEL_KEYS: Record<(typeof THEME_DENSITIES)[number], MessageKey> = {
  compact: 'theme.density.compact',
  comfortable: 'theme.density.comfortable',
  spacious: 'theme.density.spacious',
};

const COLOR_MODE_LABEL_KEYS: Record<(typeof THEME_COLOR_MODES)[number], MessageKey> = {
  light: 'theme.colorMode.light',
  dark: 'theme.colorMode.dark',
  auto: 'theme.colorMode.auto',
};

const ANIMATION_LABEL_KEYS: Record<(typeof THEME_ANIMATIONS)[number], MessageKey> = {
  none: 'theme.animation.none',
  soft: 'theme.animation.soft',
  bold: 'theme.animation.bold',
};

/** Style tab: colours, fonts, corners, buttons, density, colour mode, motion. */
export const StylePanel = ({ design }: { design: DesignTokensController }) => {
  const t = useT();

  const toOptions = <T extends string>(
    values: readonly T[],
    labels: Record<T, MessageKey>,
  ): { value: T; label: string }[] =>
    values.map((value) => ({ value, label: t(labels[value]) }));

  if (design.loading && !design.tokens) {
    return (
      <div className="design-panel" aria-busy="true">
        <Skeleton shape="block" height={120} />
        <Skeleton shape="block" height={240} />
      </div>
    );
  }

  if (!design.tokens) {
    return (
      <EmptyState
        tone="error"
        title={t('design.styleLoadError')}
        description={design.error ?? t('common.genericError')}
        action={
          <Button variant="secondary" onClick={() => void design.reload()}>
            {t('common.retry')}
          </Button>
        }
      />
    );
  }

  const tokens = design.tokens.tokens;
  const patch = (next: ThemeTokensPatch): void => void design.update(next);
  const primaryOk = isAccessiblePrimary(tokens.colors.primary);

  return (
    <div className="design-panel">
      <section className="design-section">
        <h2 className="design-section__title">{t('design.colors')}</h2>
        <div className="design-grid">
          <ColorPicker
            label={t('design.primaryColor')}
            value={tokens.colors.primary}
            onChange={(value) => patch({ colors: { primary: value } })}
          />
          <ColorPicker
            label={t('design.accentColor')}
            value={tokens.colors.accent}
            onChange={(value) => patch({ colors: { accent: value } })}
          />
        </div>
        {!primaryOk ? (
          <p className="design-warning" role="status">
            {t('design.contrastWarning')}
          </p>
        ) : null}
      </section>

      <section className="design-section">
        <h2 className="design-section__title">{t('design.fonts')}</h2>
        <div className="design-grid">
          <Select
            label={t('design.headingFont')}
            options={FONT_OPTIONS}
            value={tokens.fonts.heading}
            onChange={(event) => patch({ fonts: { heading: event.target.value } })}
          />
          <Select
            label={t('design.bodyFont')}
            options={FONT_OPTIONS}
            value={tokens.fonts.body}
            onChange={(event) => patch({ fonts: { body: event.target.value } })}
          />
        </div>
      </section>

      <section className="design-section">
        <h2 className="design-section__title">{t('design.shapeAndButtons')}</h2>
        <div className="design-grid">
          <Select
            label={t('design.radius')}
            options={toOptions(THEME_RADIUS_SCALES, RADIUS_LABEL_KEYS)}
            value={tokens.radius}
            onChange={(event) => patch({ radius: event.target.value as typeof tokens.radius })}
          />
          <Select
            label={t('design.buttonStyle')}
            options={toOptions(THEME_BUTTON_STYLES, BUTTON_LABEL_KEYS)}
            value={tokens.button}
            onChange={(event) => patch({ button: event.target.value as typeof tokens.button })}
          />
          <Select
            label={t('design.density')}
            options={toOptions(THEME_DENSITIES, DENSITY_LABEL_KEYS)}
            value={tokens.density}
            onChange={(event) => patch({ density: event.target.value as typeof tokens.density })}
          />
          <Select
            label={t('design.colorMode')}
            options={toOptions(THEME_COLOR_MODES, COLOR_MODE_LABEL_KEYS)}
            value={tokens.colorMode}
            onChange={(event) =>
              patch({ colorMode: event.target.value as typeof tokens.colorMode })
            }
          />
          <Select
            label={t('design.animation')}
            options={toOptions(THEME_ANIMATIONS, ANIMATION_LABEL_KEYS)}
            value={tokens.animation}
            onChange={(event) =>
              patch({ animation: event.target.value as typeof tokens.animation })
            }
          />
        </div>
      </section>

      <section className="design-section">
        <h2 className="design-section__title">{t('design.preview')}</h2>
        <div
          className="design-preview"
          style={themeCssVariables(tokens) as unknown as CSSProperties}
          data-color-mode={tokens.colorMode}
          data-button-style={tokens.button}
          data-density={tokens.density}
          data-animation={tokens.animation}
        >
          <p className="design-preview__eyebrow">{tokens.colors.primary}</p>
          <h3 className="design-preview__heading">{t('design.previewHeading')}</h3>
          <p className="design-preview__body">{t('design.previewBody')}</p>
          <span className="design-preview__button">{t('design.previewButton')}</span>
        </div>
      </section>

      <div className="design-actions">
        <Button variant="secondary" disabled={design.saving} onClick={() => void design.reset()}>
          {t('design.reset')}
        </Button>
        {design.saving ? <span className="design-status">{t('design.saving')}</span> : null}
        {design.error ? (
          <span className="design-error" role="alert">
            {design.error}
          </span>
        ) : null}
      </div>
    </div>
  );
};
