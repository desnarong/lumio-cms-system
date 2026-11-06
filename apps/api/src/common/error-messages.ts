import type { ApiLocale } from '@lumio/shared';
import { ERROR_EN } from './error-messages.en';

const HOLE = /\{(\d+)\}/g;
const escapeRegExp = (text: string): string => text.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

interface Pattern {
  readonly match: RegExp;
  readonly holes: readonly number[];
  readonly english: string;
}

/** Messages with `{1}` holes, compiled once into anchored patterns. */
const PATTERNS: readonly Pattern[] = Object.entries(ERROR_EN)
  .filter(([thai]) => HOLE.test(thai))
  .map(([thai, english]) => {
    const holes = [...thai.matchAll(HOLE)].map((m) => Number(m[1]));
    const source = thai
      .split(HOLE)
      .map((part, index) => (index % 2 === 0 ? escapeRegExp(part) : '(.+?)'))
      .join('');
    return { match: new RegExp(`^${source}$`, 'u'), holes, english };
  });

const fromPattern = (message: string): string | undefined => {
  for (const pattern of PATTERNS) {
    const found = pattern.match.exec(message);
    if (!found) continue;
    const values = new Map(pattern.holes.map((hole, index) => [hole, found[index + 1] ?? '']));
    return pattern.english.replace(HOLE, (_all, hole: string) => values.get(Number(hole)) ?? '');
  }
  return undefined;
};

/**
 * The client-facing message in the request's language. Thai is the source
 * text, so `th` (and anything without an English entry) returns it as is.
 */
export const translateErrorMessage = (message: string, locale: ApiLocale): string => {
  if (locale !== 'en') return message;
  return ERROR_EN[message] ?? fromPattern(message) ?? message;
};
