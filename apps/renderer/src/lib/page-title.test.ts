import { describe, expect, it } from 'vitest';
import type { BlockNode } from '@lumio/shared';
import { fallbackTitle, hasHeadingOne } from './page-title';

const block = (type: string, props: Record<string, unknown> = {}, children: BlockNode[] = []): BlockNode => ({
  id: `${type}-1`,
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

describe('hasHeadingOne', () => {
  it('recognises a hero block as the page h1', () => {
    expect(hasHeadingOne([block('hero')])).toBe(true);
  });

  it('recognises a heading block set to h1', () => {
    expect(hasHeadingOne([block('heading', { level: 'h1' })])).toBe(true);
    expect(hasHeadingOne([block('heading', { level: 'h2' })])).toBe(false);
  });

  it('looks inside nested blocks', () => {
    expect(hasHeadingOne([block('section', {}, [block('heading', { level: 'h1' })])])).toBe(true);
  });

  it('reports false for a page of paragraphs', () => {
    expect(hasHeadingOne([block('paragraph'), block('features')])).toBe(false);
  });
});

describe('fallbackTitle', () => {
  it('adds the title only when no block provides an h1', () => {
    expect(fallbackTitle([block('paragraph')], 'เกี่ยวกับเรา')).toBe('เกี่ยวกับเรา');
    expect(fallbackTitle([block('hero')], 'หน้าแรก')).toBeNull();
  });
});
