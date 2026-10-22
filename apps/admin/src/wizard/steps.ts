import {
  BUSINESS_TYPES,
  DEFAULT_THEME_TOKENS,
  applyThemeStylePreset,
  applyThemeTokensPatch,
  normalizeThemeTokens,
  slugify,
  type BrandPalette,
  type BusinessType,
  type CreateSiteFromTemplateInput,
  type TemplateSummary,
  type ThemeStyleId,
  type ThemeTokens,
} from '@lumio/shared';
import type { MessageKey } from '@lumio/ui';

/**
 * The five wizard steps (docs/design/04-ux.md 4.1), and the pure rules behind
 * them: what the user must fill in before moving on, and what the five answers
 * turn into when the site is created. Keeping it pure means the flow is testable
 * without rendering anything.
 */

export const WIZARD_STEP_IDS = ['business', 'name', 'style', 'color', 'create'] as const;
export type WizardStepId = (typeof WIZARD_STEP_IDS)[number];

export interface WizardStep {
  id: WizardStepId;
  titleKey: MessageKey;
  hintKey: MessageKey;
}

export const WIZARD_STEPS: readonly WizardStep[] = [
  {
    id: 'business',
    titleKey: 'wizard.step.business.title',
    hintKey: 'wizard.step.business.hint',
  },
  { id: 'name', titleKey: 'wizard.step.name.title', hintKey: 'wizard.step.name.hint' },
  { id: 'style', titleKey: 'wizard.step.style.title', hintKey: 'wizard.step.style.hint' },
  { id: 'color', titleKey: 'wizard.step.color.title', hintKey: 'wizard.step.color.hint' },
  { id: 'create', titleKey: 'wizard.step.create.title', hintKey: 'wizard.step.create.hint' },
] as const;

export interface WizardDraft {
  businessType: BusinessType;
  name: string;
  subdomain: string;
  /** Logo picked in step 2; upload is optional. */
  logoMediaId: string | null;
  styleId: ThemeStyleId;
  primaryColor: string;
  accentColor: string | null;
  /** Extra languages to build in the background (docs/design/17-i18n.md 17.1). */
  extraLocales: string[];
}

export const initialDraft = (): WizardDraft => ({
  businessType: 'other',
  name: '',
  subdomain: '',
  logoMediaId: null,
  styleId: 'soft',
  primaryColor: DEFAULT_THEME_TOKENS.colors.primary,
  accentColor: null,
  extraLocales: [],
});

/** Business types offered in step 1 (all of them, with Thai labels). */
export const BUSINESS_TYPE_OPTIONS = BUSINESS_TYPES;

/** Turns a site name into a usable subdomain; Thai names fall back to a hint. */
export const subdomainFromName = (name: string): string => slugify(name, '');

export const stepIndex = (id: WizardStepId): number =>
  WIZARD_STEP_IDS.findIndex((candidate) => candidate === id);

export interface StepCheck {
  ok: boolean;
  /** Why the user may not move on, as a message the screen translates. */
  messageKey?: MessageKey;
}

/** Whether the user may move on, and why not when they may not. */
export const checkStep = (id: WizardStepId, draft: WizardDraft): StepCheck => {
  if (id === 'name') {
    if (draft.name.trim().length === 0)
      return { ok: false, messageKey: 'wizard.error.name' };
    if (draft.subdomain.trim().length < 3) {
      return { ok: false, messageKey: 'wizard.error.subdomain' };
    }
  }
  return { ok: true };
};

/** The template the wizard will build from: the one matching the business type. */
export const templateForBusinessType = (
  templates: readonly TemplateSummary[],
  businessType: BusinessType,
): TemplateSummary | null =>
  templates.find((template) => template.businessType === businessType) ?? templates[0] ?? null;

/** Live preview of the theme: template tokens + chosen style + chosen colour. */
export const previewTokens = (
  template: TemplateSummary | null,
  draft: WizardDraft,
): ThemeTokens => {
  const base = template?.tokens ?? normalizeThemeTokens({});
  const styled = applyThemeStylePreset(base, draft.styleId);
  return applyThemeTokensPatch(styled, {
    colors: {
      primary: draft.primaryColor,
      ...(draft.accentColor ? { accent: draft.accentColor } : {}),
    },
  });
};

/** "Use the colours from my logo": only the two colour answers move. */
export const withBrandPalette = (draft: WizardDraft, palette: BrandPalette): WizardDraft => ({
  ...draft,
  primaryColor: palette.primary,
  accentColor: palette.accent,
});

/** Step 1-4 answers, in the shape `POST /sites` expects. */
export const buildCreateInput = (draft: WizardDraft): CreateSiteFromTemplateInput => ({
  businessType: draft.businessType,
  name: draft.name.trim(),
  subdomain: draft.subdomain.trim(),
  localeDefault: 'th',
  styleId: draft.styleId,
  primaryColor: draft.primaryColor,
  publishNow: true,
  locales: draft.extraLocales,
  ...(draft.accentColor ? { accentColor: draft.accentColor } : {}),
  ...(draft.logoMediaId ? { logoMediaId: draft.logoMediaId } : {}),
});
