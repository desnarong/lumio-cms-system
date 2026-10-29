import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

/**
 * Blocks are rendered on the public site, which has to work on every phone, and
 * inside the editor canvas, which shows the same phone widths. Multi-column
 * layouts therefore start at one column and only widen on a wide screen.
 */

const css = readFileSync(new URL('./styles.css', import.meta.url), 'utf8');

describe('block styles on a phone', () => {
  it('starts every card grid at one column', () => {
    expect(css).toMatch(/\.lumio-features__grid\s*\{[^}]*grid-template-columns:\s*1fr/s);
  });

  it('widens card grids only from a tablet or a desktop up', () => {
    expect(css).toContain('@media (min-width: 640px)');
    expect(css).toContain('@media (min-width: 1024px)');
  });

  it('shows one product or post per row on a phone, whatever the editor picked', () => {
    expect(css).toMatch(
      /@media \(max-width: 767px\)[^@]*\.lumio-products\[data-columns\] \.lumio-products__grid,[^}]*\.lumio-posts\[data-columns\] \.lumio-posts__grid\s*\{[^}]*grid-template-columns:\s*minmax\(0, 1fr\)/s,
    );
  });

  it('keeps a real gutter between a phone card and the screen edge', () => {
    expect(css).toMatch(/\.lumio-products,\s*\.lumio-posts\s*\{[^}]*padding-inline:\s*max\(/s);
  });

  it('stacks the split hero instead of squeezing it beside the picture', () => {
    expect(css).toMatch(
      /@media \(min-width: 1024px\)\s*\{[^}]*\.lumio-hero--split-right\s*\{[^}]*grid-template-columns/s,
    );
  });

  it('lets a dragged desktop size fall back to the column on a phone', () => {
    expect(css).toContain('.lumio-block[data-custom-width] > .lumio-block__inner');
    expect(css).toMatch(/\.lumio-hero__subheading,\s*\.lumio-hero__note\s*\{[^}]*max-width: 100%/s);
  });

  it('keeps a phone headline in proportion and caps the text-size slider', () => {
    expect(css).toMatch(
      /@media \(max-width: 767px\)\s*\{[^}]*\.lumio-heading--h1[^}]*clamp\(var\(--text-2xl\), 9vw, var\(--text-3xl\)\)/s,
    );
    expect(css).toContain('min(var(--block-text-scale, 1), 1.5)');
  });

  it('caps a hand-typed text size on a phone instead of rendering 85px', () => {
    expect(css).toContain(".lumio-run[data-run-size='true']");
    expect(css).toMatch(
      /\.lumio-hero__heading \.lumio-run\[data-run-size='true'\][^}]*min\(max\(var\(--text-2xl\), 9vw\)/s,
    );
    expect(css).toContain('var(--run-size, var(--text-lg))');
  });

  it('keeps card text readable when the section behind it is a brand band', () => {
    expect(css).toMatch(
      /\.lumio-products__card,\s*\.lumio-posts__card\s*\{[^}]*color: var\(--color-text\)/s,
    );
    expect(css).toMatch(/\.lumio-products__media \.lumio-img--placeholder[^}]*aspect-ratio: auto/s);
  });
});
