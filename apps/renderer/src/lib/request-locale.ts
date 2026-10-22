import { headers } from 'next/headers';
import { DEFAULT_LOCALE } from './locale';

/** Header the middleware sets after stripping (or reading) the locale prefix. */
export const LOCALE_HEADER = 'x-lumio-locale';

/** Language of the incoming request, read on the server only. */
export const requestLocale = async (): Promise<string> => {
  const store = await headers();
  const value = store.get(LOCALE_HEADER);
  return value && value.length > 0 ? value : DEFAULT_LOCALE;
};