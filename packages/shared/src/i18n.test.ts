import { describe, expect, it } from 'vitest';
import type { BlockNode } from './blocks.js';
import {
  applyBlockTranslations,
  buildHreflangLinks,
  collectBlockTexts,
  createTranslationInputSchema,
  hreflangMap,
  isSupportedLocale,
  localePathFor,
  mapBlockTexts,
  missingTranslationIndexes,
  negotiateLocale,
  normalizeLocale,
  normalizeLocales,
  otherLocales,
  parseAcceptLanguage,
  splitLocaleHost,
  splitLocalePath,
  translateContentInputSchema,
  translationCoverage,
  type TranslatableText,
} from './i18n.js';

const node = (id: string, type: string, props: Record<string, unknown>, children: BlockNode[] = []): BlockNode => ({
  id,
  type,
  version: 1,
  props,
  style: {
    paddingY: 'md',
    paddingX: 'md',
    background: 'none',
    visibility: { mobile: true, tablet: true, desktop: true },
    animation: 'none',
  },
  children,
});

describe('locale helpers', () => {
  it('recognises the shipped languages and falls back otherwise', () => {
    expect(isSupportedLocale('en')).toBe(true);
    expect(isSupportedLocale('fr')).toBe(false);
    expect(normalizeLocale('EN')).toBe('th');
    expect(normalizeLocale('en')).toBe('en');
    expect(normalizeLocale(undefined)).toBe('th');
  });

  it('always keeps the default language first and dedupes', () => {
    expect(normalizeLocales(['en', 'th', 'en'])).toEqual(['th', 'en']);
    expect(normalizeLocales([], 'en')).toEqual(['en']);
    expect(normalizeLocales(['TH', ' en ', ''])).toEqual(['th', 'en']);
  });

  it('lists only the languages that get a URL prefix', () => {
    expect(otherLocales(['th', 'en'])).toEqual(['en']);
    expect(otherLocales(['en'], 'en')).toEqual([]);
  });
});

describe('localePathFor', () => {
  it('leaves the default language prefix-free', () => {
    expect(localePathFor('page', 'home', 'th')).toBe('/');
    expect(localePathFor('page', 'about', 'th')).toBe('/about');
    expect(localePathFor('post', 'beans', 'th')).toBe('/posts/beans');
  });

  it('prefixes every other language', () => {
    expect(localePathFor('page', 'home', 'en')).toBe('/en');
    expect(localePathFor('page', 'about', 'en')).toBe('/en/about');
    expect(localePathFor('post', 'beans', 'en')).toBe('/en/posts/beans');
  });
});

describe('splitLocalePath', () => {
  it('strips a non-default prefix', () => {
    expect(splitLocalePath('/en/about', ['th', 'en'])).toEqual({
      locale: 'en',
      path: '/about',
      hasPrefix: true,
    });
    expect(splitLocalePath('/en', ['th', 'en'])).toEqual({ locale: 'en', path: '/', hasPrefix: true });
  });

  it('flags a default-language prefix so it can be canonicalised away', () => {
    expect(splitLocalePath('/th/about', ['th', 'en'])).toEqual({
      locale: 'th',
      path: '/about',
      hasPrefix: true,
    });
  });

  it('passes an un-prefixed path through as the default language', () => {
    expect(splitLocalePath('/posts/beans', ['th', 'en'])).toEqual({
      locale: 'th',
      path: '/posts/beans',
      hasPrefix: false,
    });
    expect(splitLocalePath('/', ['th', 'en'])).toEqual({ locale: 'th', path: '/', hasPrefix: false });
  });

  it('ignores a prefix that is not an offered language', () => {
    expect(splitLocalePath('/about', ['th'])).toEqual({ locale: 'th', path: '/about', hasPrefix: false });
  });
});

describe('buildHreflangLinks', () => {
  it('adds an x-default entry that points at the default language', () => {
    const links = buildHreflangLinks([
      { locale: 'th', href: 'https://x.test/about' },
      { locale: 'en', href: 'https://x.test/en/about' },
    ]);
    expect(links).toEqual([
      { hreflang: 'th', href: 'https://x.test/about' },
      { hreflang: 'en', href: 'https://x.test/en/about' },
      { hreflang: 'x-default', href: 'https://x.test/about' },
    ]);
  });

  it('omits x-default when the default language is missing', () => {
    expect(buildHreflangLinks([{ locale: 'en', href: '/en' }])).toEqual([
      { hreflang: 'en', href: '/en' },
    ]);
  });
});

describe('hreflangMap', () => {
  it('keeps only the languages that exist and adds x-default', () => {
    const map = hreflangMap([
      { locale: 'th', href: 'https://x.test/', available: true },
      { locale: 'en', href: 'https://x.test/en', available: true },
      { locale: 'fr', href: 'https://x.test/fr', available: false },
    ]);

    expect(map).toEqual({
      th: 'https://x.test/',
      en: 'https://x.test/en',
      'x-default': 'https://x.test/',
    });
  });

  it('is empty when nothing is available', () => {
    expect(hreflangMap([{ locale: 'en', href: '/en', available: false }])).toEqual({});
  });
});

describe('translationCoverage', () => {
  it('marks languages without a page as missing', () => {
    const coverage = translationCoverage(
      'group-1',
      ['th', 'en'],
      [{ locale: 'th', contentId: 'c1', title: 'หน้าแรก', slug: 'home', status: 'published' }],
    );
    expect(coverage.groupId).toBe('group-1');
    expect(coverage.items).toHaveLength(2);
    expect(coverage.items[0]).toMatchObject({ locale: 'th', exists: true, status: 'published' });
    expect(coverage.items[1]).toEqual({
      locale: 'en',
      contentId: null,
      title: null,
      slug: null,
      status: null,
      exists: false,
    });
  });
});

describe('createTranslationInputSchema', () => {
  it('defaults translate to false and lowercases the locale', () => {
    const parsed = createTranslationInputSchema.parse({ locale: 'EN' });
    expect(parsed).toEqual({ locale: 'en', translate: false });
  });
});

describe('block text translation', () => {
  const tree: BlockNode[] = [
    node('b1', 'hero', {
      heading: 'กาแฟบ้านดอย',
      subheading: 'คั่วสดใหม่ทุกเช้า',
      href: '/about',
      buttons: [{ label: 'ดูเมนู', href: '/menu', variant: 'primary' }],
    }),
    node('b2', 'features', {
      heading: 'จุดเด่น',
      items: [{ title: 'คั่วเอง', description: 'ควบคุมคุณภาพทุกขั้น', icon: 'star' }],
      columns: 3,
    }),
  ];

  it('collects only user-facing copy, skipping links and ids', () => {
    const texts = collectBlockTexts(tree).map((entry) => entry.text);
    expect(texts).toEqual(['กาแฟบ้านดอย', 'คั่วสดใหม่ทุกเช้า', 'ดูเมนู', 'จุดเด่น', 'คั่วเอง', 'ควบคุมคุณภาพทุกขั้น']);
  });

  it('reports the block type and prop key for each entry', () => {
    const texts = collectBlockTexts(tree);
    expect(texts[2]).toEqual({ blockType: 'hero', key: 'buttons.label', text: 'ดูเมนู' });
    expect(texts[3]).toEqual({ blockType: 'features', key: 'heading', text: 'จุดเด่น' });
  });

  it('applies translations in the same order they were collected', () => {
    const count = collectBlockTexts(tree).length;
    const translated = applyBlockTranslations(tree, Array.from({ length: count }, (_, i) => `t${i}`));
    expect(collectBlockTexts(translated).map((entry) => entry.text)).toEqual([
      't0',
      't1',
      't2',
      't3',
      't4',
      't5',
    ]);
  });

  it('never rewrites links or layout props', () => {
    const translated = applyBlockTranslations(tree, ['a', 'b', 'c', 'd', 'e', 'f']);
    expect(translated[0]?.props.href).toBe('/about');
    expect(((translated[0]?.props.buttons as { href: string }[])[0] ?? {}).href).toBe('/menu');
    expect(translated[0]?.props.buttons).toMatchObject([{ variant: 'primary' }]);
    expect(translated[1]?.props.columns).toBe(3);
  });

  it('leaves the source tree untouched', () => {
    mapBlockTexts(tree, () => 'changed');
    expect(tree[0]?.props.heading).toBe('กาแฟบ้านดอย');
  });
});

describe('missingTranslationIndexes', () => {
  const entry = (text: string): TranslatableText => ({ blockType: 'hero', key: 'text', text });

  it('flags empty copy and anything still identical to the source', () => {
    const current = [entry('กาแฟบ้านดอย'), entry('Fresh coffee'), entry('  '), entry('ดูเมนู')];
    const source = [entry('กาแฟบ้านดอย'), entry('กาแฟบ้านดอย'), entry('ดูเมนู'), entry('กาแฟบ้านดอย')];
    expect(missingTranslationIndexes(current, source)).toEqual([0, 2]);
  });

  it('treats every position as missing when there is no source to compare with', () => {
    expect(missingTranslationIndexes([entry('หนึ่ง'), entry('สอง')])).toEqual([0, 1]);
  });

  it('counts positions past the end of the source as missing', () => {
    const current = [entry('one'), entry('two'), entry('three')];
    const source = [entry('เอก'), entry('สอง')];
    expect(missingTranslationIndexes(current, source)).toEqual([2]);
  });
});

describe('translateContentInputSchema', () => {
  it('defaults to translating only the missing texts', () => {
    expect(translateContentInputSchema.parse({})).toEqual({ onlyMissing: true });
    expect(translateContentInputSchema.parse({ onlyMissing: false })).toEqual({ onlyMissing: false });
  });
});

describe('parseAcceptLanguage', () => {
  it('orders the tags by quality', () => {
    expect(parseAcceptLanguage('en;q=0.8, th;q=0.9, fr')).toEqual([
      { tag: 'fr', quality: 1 },
      { tag: 'th', quality: 0.9 },
      { tag: 'en', quality: 0.8 },
    ]);
  });

  it('ignores an empty header and broken entries', () => {
    expect(parseAcceptLanguage(null)).toEqual([]);
    expect(parseAcceptLanguage('   ')).toEqual([]);
    expect(parseAcceptLanguage(',en,;,')).toEqual([{ tag: 'en', quality: 1 }]);
  });

  it('keeps the client order for equal quality', () => {
    expect(parseAcceptLanguage('en, th').map((entry) => entry.tag)).toEqual(['en', 'th']);
  });
});

describe('negotiateLocale', () => {
  it('picks the most preferred language the site offers', () => {
    expect(negotiateLocale('en-GB,en;q=0.9,th;q=0.5', ['th', 'en'])).toBe('en');
    expect(negotiateLocale('th-TH,th;q=0.9', ['th', 'en'])).toBe('th');
  });

  it('matches a region tag against an offered primary language', () => {
    expect(negotiateLocale('pt-br,pt;q=0.9', ['th', 'en', 'pt'])).toBe('pt');
  });

  it('falls back to the default language when nothing matches', () => {
    expect(negotiateLocale('de,fr;q=0.9', ['th', 'en'])).toBe('th');
    expect(negotiateLocale('*', ['th', 'en'])).toBe('th');
    expect(negotiateLocale('', ['th', 'en'])).toBe('th');
    expect(negotiateLocale('de', ['th', 'en'])).toBe('th');
  });

  it('never follows a language the visitor marked as unacceptable', () => {
    expect(negotiateLocale('en;q=0, th;q=0.2', ['th', 'en'])).toBe('th');
  });
});

describe('splitLocaleHost', () => {
  it('reads an offered language from the first label', () => {
    expect(splitLocaleHost('en.baandoi.lumio.app', ['th', 'en'])).toEqual({
      host: 'baandoi.lumio.app',
      locale: 'en',
    });
  });

  it('leaves a host alone when the label is not an offered language', () => {
    expect(splitLocaleHost('www.baandoi.com', ['th', 'en'])).toEqual({
      host: 'www.baandoi.com',
      locale: null,
    });
    expect(splitLocaleHost('en', ['th', 'en'])).toEqual({ host: 'en', locale: null });
    expect(splitLocaleHost('de.baandoi.com', ['th', 'en'])).toEqual({
      host: 'de.baandoi.com',
      locale: null,
    });
  });

  it('normalises the case of the host before deciding', () => {
    expect(splitLocaleHost('EN.Baandoi.Lumio.App.', ['th', 'en'])).toEqual({
      host: 'baandoi.lumio.app',
      locale: 'en',
    });
  });
});