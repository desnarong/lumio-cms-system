import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import {
  EN_MESSAGES,
  TH_MESSAGES,
  UI_LOCALES,
  createTranslator,
  interpolate,
  isUiLocale,
  MessagesProvider,
  translateNow,
  uiLocaleNow,
  uiLocaleOptions,
  useT,
  useUiLocale,
} from './i18n.js';

/** Renders the translator of the surrounding provider, for provider tests. */
const Probe = (): string => {
  const t = useT();
  return t('shell.signOut');
};

const LocaleProbe = (): string => useUiLocale();

describe('message catalogue', () => {
  it('answers in Thai by default, so a Thai-only deployment is unchanged', () => {
    const t = createTranslator('th');

    expect(t('common.close')).toBe('ปิด');
    expect(t('nav.dashboard')).toBe('ภาพรวม');
    expect(t('shell.signOut')).toBe('ออกจากระบบ');
  });

  it('answers in English when the screen asks for it', () => {
    const t = createTranslator('en');

    expect(t('common.close')).toBe('Close');
    expect(t('nav.dashboard')).toBe('Overview');
    expect(t('shell.signOut')).toBe('Sign out');
  });

  it('falls back to Thai rather than showing a key', () => {
    // Every English string is optional; a half-translated screen must still read
    // as one language instead of leaking "nav.something".
    const t = createTranslator('en');
    const untranslated = Object.keys(TH_MESSAGES).filter((key) => !(key in EN_MESSAGES));

    for (const key of untranslated) {
      expect(t(key as keyof typeof TH_MESSAGES)).toBe(TH_MESSAGES[key as keyof typeof TH_MESSAGES]);
    }
  });

  it('keeps the two catalogues in the same shape', () => {
    for (const key of Object.keys(EN_MESSAGES)) {
      expect(Object.keys(TH_MESSAGES)).toContain(key);
    }
  });

  it('offers every supported language with its own label', () => {
    expect(uiLocaleOptions()).toEqual([
      { value: 'th', label: 'ไทย' },
      { value: 'en', label: 'English' },
    ]);
    expect(UI_LOCALES).toEqual(['th', 'en']);
    expect(isUiLocale('en')).toBe(true);
    expect(isUiLocale('de')).toBe(false);
    expect(isUiLocale(null)).toBe(false);
  });
});

describe('interpolate', () => {
  it('replaces named placeholders', () => {
    expect(interpolate('สวัสดี คุณ{name} 👋', { name: 'สมชาย' })).toBe('สวัสดี คุณสมชาย 👋');
    expect(interpolate('{done} จาก {total} ข้อ', { done: 2, total: 6 })).toBe('2 จาก 6 ข้อ');
  });

  it('leaves unknown placeholders and missing params alone', () => {
    expect(interpolate('สวัสดี {name}')).toBe('สวัสดี {name}');
    expect(interpolate('ใช้สี {color}', {})).toBe('ใช้สี {color}');
  });
});

describe('MessagesProvider', () => {
  it('serves Thai when there is no provider', () => {
    expect(renderToStaticMarkup(<Probe />)).toBe('ออกจากระบบ');
  });

  it('serves the language of the surrounding provider', () => {
    expect(
      renderToStaticMarkup(
        <MessagesProvider locale="en">
          <Probe />
        </MessagesProvider>,
      ),
    ).toBe('Sign out');
  });

  it('exposes the language to components outside the translator', () => {
    expect(renderToStaticMarkup(<LocaleProbe />)).toBe('th');
    expect(
      renderToStaticMarkup(
        <MessagesProvider locale="en">
          <LocaleProbe />
        </MessagesProvider>,
      ),
    ).toBe('en');
  });
});
describe('translateNow', () => {
  it('follows the surrounding provider, and returns to Thai with it', () => {
    // Text built outside React (an API client's network fallback) must read in
    // whatever language the screen is showing.
    const render = (locale: 'th' | 'en'): string =>
      renderToStaticMarkup(
        <MessagesProvider locale={locale}>
          <Probe />
        </MessagesProvider>,
      );

    render('en');
    expect(translateNow('shell.signOut')).toBe('Sign out');
    expect(translateNow('media.summary', { count: 3 })).toBe('3 images · resized automatically');

    render('th');
    expect(translateNow('shell.signOut')).toBe('ออกจากระบบ');
    expect(translateNow('media.summary', { count: 3 })).toBe(
      'ทั้งหมด 3 รูป · ระบบย่อขนาดให้อัตโนมัติ',
    );
  });

  it('reports the mounted language to code outside React', () => {
    renderToStaticMarkup(
      <MessagesProvider locale="en">
        <Probe />
      </MessagesProvider>,
    );
    expect(uiLocaleNow()).toBe('en');
  });
});
