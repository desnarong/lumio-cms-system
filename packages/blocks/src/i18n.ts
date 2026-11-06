import { getActiveLocale } from '@lumio/ui/active-locale';
import { BLOCK_EN } from './messages.en.js';

export type BlockTextParams = Record<string, string | number>;

const fill = (message: string, params?: BlockTextParams): string =>
  params
    ? message.replace(/\{(\w+)\}/g, (match, name: string) =>
        name in params ? String(params[name]) : match,
      )
    : message;

/**
 * Block text in the reader's language (AGENTS.md rule 4). `text` is the Thai
 * source, which doubles as the key into `BLOCK_EN`.
 *
 * - Editor panels call it with no locale and follow the admin's language.
 * - Public block output passes the page `locale`, because the renderer serves
 *   many sites and languages at once and has no admin language.
 */
export const bt = (text: string, locale?: string | null, params?: BlockTextParams): string => {
  const language = locale ?? getActiveLocale();
  const message = language === 'en' ? (BLOCK_EN[text] ?? text) : text;
  return fill(message, params);
};

/** Translates the `label` of each option, for selects built from static lists. */
export const btOptions = <T extends { label: string }>(options: readonly T[]): T[] =>
  options.map((option) => ({ ...option, label: bt(option.label) }));
