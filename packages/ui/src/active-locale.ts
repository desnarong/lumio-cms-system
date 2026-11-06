/**
 * The language of the mounted `MessagesProvider`, readable outside React.
 *
 * It lives in its own module (and `@lumio/ui/active-locale` subpath) so the
 * block package can follow the admin's language without importing the whole UI
 * kit into the public renderer. Both entry points resolve to this one file, so
 * they share the value.
 */
export type ActiveLocale = 'th' | 'en';

let activeLocale: ActiveLocale = 'th';

export const setActiveLocale = (locale: ActiveLocale): void => {
  activeLocale = locale;
};

/** Thai until a provider mounts. */
export const getActiveLocale = (): ActiveLocale => activeLocale;
