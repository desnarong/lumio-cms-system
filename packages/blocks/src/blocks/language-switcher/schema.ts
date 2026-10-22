import { z } from 'zod';
import { blockStyleSchema } from '@lumio/shared';

export const LANGUAGE_DISPLAYS = ['inline', 'stacked'] as const;
export type LanguageDisplay = (typeof LANGUAGE_DISPLAYS)[number];

export const languageSwitcherPropsSchema = z.object({
  /** Heading above the links; empty hides it. */
  label: z.string().max(60).default('ภาษา'),
  display: z.enum(LANGUAGE_DISPLAYS).default('inline'),
  /** Show languages the page has no version in, greyed out, instead of hiding them. */
  showUnavailable: z.boolean().default(false),
});

export const languageSwitcherSchema = z.object({
  version: z.literal(1),
  props: languageSwitcherPropsSchema,
  style: blockStyleSchema.default({}),
});

export type LanguageSwitcherProps = z.infer<typeof languageSwitcherPropsSchema>;