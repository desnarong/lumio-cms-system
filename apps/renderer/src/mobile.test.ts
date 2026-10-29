import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

/**
 * The public site is the half of Lumio that has to work on every phone, and the
 * rules that guarantee it live in CSS. These checks fail when a layout rule is
 * added that a 360px screen cannot honour.
 */

const globals = readFileSync(new URL('./app/globals.css', import.meta.url), 'utf8');
const shop = readFileSync(new URL('./app/shop.css', import.meta.url), 'utf8');

/** Every `width: 900px` style declaration that is not already relative. */
const fixedWidthsOver = (css: string, limit: number): string[] => {
  const found: string[] = [];
  const lines = css.split('\n');

  lines.forEach((line, index) => {
    const match = line.match(/^\s*(width|min-width|flex-basis)\s*:\s*(.+)$/);
    if (!match) return;
    const value = match[2] ?? '';
    if (/max-width|min\(|clamp\(|100%|auto/.test(value)) return;
    for (const size of value.matchAll(/(\d+)px/g)) {
      if (Number(size[1]) > limit) found.push(`${index + 1}: ${line.trim()}`);
    }
  });

  return found;
};

describe('public site on a phone', () => {
  it('gives the menu and the shortcuts a thumb-sized target', () => {
    expect(globals).toContain('.site-header .site-nav__link');
    expect(globals).toContain('min-height: var(--layout-tap-target)');
    expect(shop).toContain('min-height: var(--layout-tap-target)');
  });

  it('keeps the chrome clear of the notch and the home indicator', () => {
    expect(globals).toContain('env(safe-area-inset-left)');
    expect(globals).toContain('env(safe-area-inset-bottom');
  });

  it('lets wide content scroll inside its own box instead of the page', () => {
    expect(globals).toContain('overflow-x: auto');
    expect(globals).toContain('.site {\n  overflow-x: clip;\n}');
  });

  it('folds the header menu without shipping client JavaScript', () => {
    expect(globals).toContain('.site-nav__checkbox:checked ~ .site-nav');
    expect(globals).toContain('.site-nav__toggle');
  });

  it('stacks the product facts into one column on a small phone', () => {
    expect(shop).toContain('@media (max-width: 480px)');
    expect(shop).toMatch(/\.shop-specs__row\s*\{[^}]*grid-template-columns:\s*minmax\(0, 1fr\)/s);
  });

  it('never sets a fixed width a 360px screen cannot show', () => {
    expect(fixedWidthsOver(globals, 360)).toEqual([]);
    expect(fixedWidthsOver(shop, 360)).toEqual([]);
  });

  it('pins the page to the real phone width instead of zooming a desktop one', () => {
    const layout = readFileSync(new URL('./app/layout.tsx', import.meta.url), 'utf8');
    expect(layout).toContain("width: 'device-width'");
    expect(layout).toContain('initialScale: 1');
  });

  it('lets shop headlines follow the phone width', () => {
    expect(shop).toMatch(
      /@media \(max-width: 767px\)\s*\{[^}]*\.shop-hero__title[^}]*clamp\(/s,
    );
  });

  it('keeps the back-to-top button out of the way of card content', () => {
    expect(globals).toMatch(
      /\.site-footer > \.site-back-to-top\s*\{[^}]*position: static/s,
    );
  });

  it('shows a post cover beside the copy on a desktop and above it on a phone', () => {
    expect(globals).toMatch(
      /\.site-post-list__link--with-cover\s*\{[^}]*grid-template-columns:\s*220px minmax\(0, 1fr\)/s,
    );
    expect(globals).toMatch(/\.site-post-list__cover\s*\{[^}]*object-fit: cover/s);
    expect(globals).toContain('.site-article--posts');
  });
});
