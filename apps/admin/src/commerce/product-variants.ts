import type { ProductOption } from '@lumio/shared';

/**
 * Text format the product editor uses for options: one option per line, e.g.
 *
 *   ไซซ์: S, M, L
 *   สี: ดำ, ขาว
 *
 * It keeps the form keyboard-friendly and easy to validate, while the API still
 * receives the structured array.
 */

const splitValues = (value: string): string[] =>
  value
    .split(',')
    .map((entry) => entry.trim())
    .filter((entry) => entry.length > 0);

export const parseOptionsText = (text: string): ProductOption[] =>
  text
    .split('\n')
    .map((line) => line.trim())
    .filter((line) => line.length > 0)
    .flatMap((line) => {
      const separator = line.search(/[:：=]/);
      if (separator <= 0) return [];
      const name = line.slice(0, separator).trim();
      const values = splitValues(line.slice(separator + 1));
      return name && values.length > 0 ? [{ name, values }] : [];
    })
    .slice(0, 3);

export const formatOptionsText = (options: readonly ProductOption[]): string =>
  options.map((option) => `${option.name}: ${option.values.join(', ')}`).join('\n');

export const combinationKey = (options: Record<string, string>): string =>
  Object.entries(options)
    .map(([name, value]) => `${name}=${value}`)
    .join('|');

/** Every size/colour combination; empty options mean a single default variant. */
export const optionCombinations = (
  options: readonly ProductOption[],
): Record<string, string>[] => {
  if (options.length === 0) return [];
  return options.reduce<Record<string, string>[]>(
    (rows, option) =>
      rows.flatMap((row) => option.values.map((value) => ({ ...row, [option.name]: value }))),
    [{}],
  );
};

export const combinationLabel = (
  options: readonly ProductOption[],
  values: Record<string, string>,
): string =>
  options
    .map((option) => values[option.name])
    .filter((value): value is string => typeof value === 'string' && value.length > 0)
    .join(' · ');
