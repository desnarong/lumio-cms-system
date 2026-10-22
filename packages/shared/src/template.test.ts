import { describe, expect, it } from 'vitest';
import type { BlockTree } from './blocks.js';
import { createSectionTemplateInputSchema } from './section-template.js';
import {
  BUSINESS_TYPES,
  BUSINESS_TYPE_LABELS,
  createSiteFromTemplateInputSchema,
  isBusinessType,
  sectionStylesSchema,
  templateManifestSchema,
  templatePageSchema,
  withSectionStyles,
} from './template.js';

describe('templateManifestSchema', () => {
  it('accepts a pack manifest', () => {
    const parsed = templateManifestSchema.parse({
      id: '0f2f6d3d-4a7b-4c21-9a1e-0d1e2f3a4b5c',
      name: 'กาแฟบ้านดอย',
      businessType: 'restaurant',
      description: 'เทมเพลตคาเฟ่ โทนอบอุ่น',
      styleId: 'soft',
    });

    expect(parsed.preview).toBe('preview.png');
  });

  it('refuses an unknown business type', () => {
    const result = templateManifestSchema.safeParse({
      id: '0f2f6d3d-4a7b-4c21-9a1e-0d1e2f3a4b5c',
      name: 'เทมเพลต',
      businessType: 'spaceship',
      description: 'x',
      styleId: 'soft',
    });

    expect(result.success).toBe(false);
    expect(isBusinessType('spaceship')).toBe(false);
  });

  it('labels every business type in Thai', () => {
    for (const type of BUSINESS_TYPES) {
      expect(BUSINESS_TYPE_LABELS[type].length).toBeGreaterThan(0);
    }
  });
});

describe('templatePageSchema', () => {
  it('defaults to a page with no blocks', () => {
    const parsed = templatePageSchema.parse({ title: 'ติดต่อเรา', slug: 'contact' });
    expect(parsed.type).toBe('page');
    expect(parsed.blocks).toEqual([]);
  });
});

describe('withSectionStyles', () => {
  const blocks: BlockTree = [
    {
      id: 'blk_1',
      type: 'hero',
      version: 1,
      props: { heading: 'กาแฟคั่วสด' },
      style: {
        paddingY: 'md',
        paddingX: 'md',
        background: 'none',
        visibility: { mobile: true, tablet: true, desktop: true },
        animation: 'none',
      },
      children: [
        {
          id: 'blk_2',
          type: 'paragraph',
          version: 1,
          props: { text: 'ยินดีต้อนรับ' },
          style: {
            paddingY: 'md',
            paddingX: 'md',
            background: 'none',
            visibility: { mobile: true, tablet: true, desktop: true },
            animation: 'none',
          },
          children: [],
        },
      ],
    },
  ];

  it('applies the per-type style without touching props', () => {
    const styles = sectionStylesSchema.parse({
      hero: { paddingY: 'xl', background: 'muted', animation: 'fade-up' },
      paragraph: { paddingY: 'sm' },
    });

    const styled = withSectionStyles(blocks, styles);

    expect(styled[0]?.style.paddingY).toBe('xl');
    expect(styled[0]?.style.background).toBe('muted');
    expect(styled[0]?.props).toEqual({ heading: 'กาแฟคั่วสด' });
    expect(styled[0]?.children[0]?.style.paddingY).toBe('sm');
    expect(styled[0]?.children[0]?.style.paddingX).toBe('md');
  });

  it('leaves blocks without a style entry untouched', () => {
    const styled = withSectionStyles(blocks, {});
    expect(styled[0]?.style.paddingY).toBe('md');
  });
});

describe('createSiteFromTemplateInputSchema', () => {
  it('fills the wizard defaults', () => {
    const parsed = createSiteFromTemplateInputSchema.parse({
      name: 'คลินิกยิ้มสวย',
      subdomain: 'yimsuay',
    });

    expect(parsed.businessType).toBe('other');
    expect(parsed.styleId).toBe('soft');
    expect(parsed.publishNow).toBe(true);
    expect(parsed.localeDefault).toBe('th');
    expect(parsed.locales).toEqual([]);
  });

  it('normalises the extra languages and caps how many a site can ask for', () => {
    const parsed = createSiteFromTemplateInputSchema.parse({
      name: 'คลินิกยิ้มสวย',
      subdomain: 'yimsuay',
      locales: ['EN', ' en '],
    });

    expect(parsed.locales).toEqual(['en', 'en']);
    expect(
      createSiteFromTemplateInputSchema.safeParse({
        name: 'x',
        subdomain: 'good-one',
        locales: ['en', 'zh', 'ja', 'fr', 'de', 'es'],
      }).success,
    ).toBe(false);
  });

  it('validates the subdomain and the brand colour', () => {
    expect(
      createSiteFromTemplateInputSchema.safeParse({ name: 'x', subdomain: 'Bad Domain' }).success,
    ).toBe(false);
    expect(
      createSiteFromTemplateInputSchema.safeParse({
        name: 'x',
        subdomain: 'good-one',
        primaryColor: 'teal',
      }).success,
    ).toBe(false);
  });
});

describe('createSectionTemplateInputSchema', () => {
  it('needs a name and at least one block', () => {
    expect(createSectionTemplateInputSchema.safeParse({ name: 'ฮีโร่', blocks: [] }).success).toBe(
      false,
    );
    expect(
      createSectionTemplateInputSchema.safeParse({
        name: 'ฮีโร่',
        blocks: [
          {
            id: 'blk_1',
            type: 'hero',
            version: 1,
            props: {},
            style: {},
            children: [],
          },
        ],
      }).success,
    ).toBe(true);
  });
});