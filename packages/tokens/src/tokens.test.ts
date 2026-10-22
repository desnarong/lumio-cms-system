import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import {
  buildThemeCss,
  flattenTokens,
  semanticColorVars,
  typographyVars,
  zIndexVars,
} from './css.js';
import { breakpoints, layout, spacing, zIndex } from './tokens.js';

describe('tokens', () => {
  it('keeps the 8px spacing grid', () => {
    expect(spacing.lg).toBe('16px');
    expect(spacing['4xl']).toBe('64px');
  });

  it('exposes ordered breakpoints', () => {
    expect(breakpoints.sm).toBeLessThan(breakpoints.lg);
    expect(breakpoints.lg).toBeLessThan(breakpoints['2xl']);
  });

  it('keeps the z-index scale ordered', () => {
    expect(zIndex.dropdown).toBeLessThan(zIndex.sticky);
    expect(zIndex.sticky).toBeLessThan(zIndex.modal);
    expect(zIndex.modal).toBeLessThan(zIndex.toast);
    expect(zIndex.toast).toBeLessThan(zIndex.tooltip);
  });

  it('keeps layout widths on the 4px grid', () => {
    for (const value of Object.values(layout)) {
      expect(Number.parseInt(value, 10) % 4).toBe(0);
    }
  });

  it('flattens nested tokens into kebab-case names', () => {
    const flat = flattenTokens({ brand: { 500: '#000' } }, 'color');
    expect(flat['color-brand-500']).toBe('#000');
  });

  it('maps semantic colors to the brand ramp', () => {
    expect(semanticColorVars['color-primary']).toBe('#6366F1');
    expect(semanticColorVars['color-success']).toBe('#10B981');
    expect(semanticColorVars['color-focus-ring']).toBeDefined();
  });

  it('emits a font-size and line-height pair per typography step', () => {
    expect(typographyVars['text-base']).toBe('16px');
    expect(typographyVars['text-base-line-height']).toBe('1.6');
  });

  it('namespaces z-index tokens with a z- prefix', () => {
    expect(zIndexVars['z-modal']).toBe('1300');
  });

  it('builds css with light and dark scopes', () => {
    const css = buildThemeCss();
    expect(css).toContain(':root {');
    expect(css).toContain('[data-theme="dark"] {');
    expect(css).toContain('--color-primary: #6366F1;');
    expect(css).toContain('prefers-reduced-motion');
  });

  it('keeps theme.css in sync with buildThemeCss()', () => {
    const file = readFileSync(new URL('../theme.css', import.meta.url), 'utf8');
    expect(file).toBe(buildThemeCss());
  });
});
