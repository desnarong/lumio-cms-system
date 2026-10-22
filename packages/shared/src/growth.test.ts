import { describe, expect, it } from 'vitest';
import {
  APP_CATALOG,
  APP_PERMISSIONS,
  analyticsChangePercent,
  analyticsRangeDays,
  blocksHaveHeadingOne,
  createSubscriberInputSchema,
  deviceLabel,
  findCatalogApp,
  hasSeoText,
  installAppInputSchema,
  isNoindex,
  isSubscriberStatus,
  seoGradeFor,
  seoMetaCandidates,
  subscribersToCsv,
  type BlockNode,
  type SeoHealth,
  type Subscriber,
} from './index.js';

const block = (overrides: Partial<BlockNode> = {}): BlockNode => ({
  id: 'b1',
  type: 'paragraph',
  version: 1,
  props: {},
  style: {
    paddingY: 'md',
    paddingX: 'md',
    background: 'none',
    visibility: { mobile: true, tablet: true, desktop: true },
    animation: 'none',
  },
  children: [],
  ...overrides,
});

describe('seoGradeFor', () => {
  it('maps the score to a friendly grade', () => {
    expect(seoGradeFor(95)).toBe('good');
    expect(seoGradeFor(90)).toBe('good');
    expect(seoGradeFor(89)).toBe('ok');
    expect(seoGradeFor(60)).toBe('ok');
    expect(seoGradeFor(59)).toBe('poor');
  });
});

describe('blocksHaveHeadingOne', () => {
  it('recognises a hero block as the page h1', () => {
    expect(blocksHaveHeadingOne([block({ type: 'hero' })])).toBe(true);
  });

  it('recognises a heading block set to h1', () => {
    expect(blocksHaveHeadingOne([block({ type: 'heading', props: { level: 'h1' } })])).toBe(true);
    expect(blocksHaveHeadingOne([block({ type: 'heading', props: { level: 'h2' } })])).toBe(false);
  });

  it('looks inside nested blocks', () => {
    const nested = block({ type: 'columns', children: [block({ type: 'hero' })] });
    expect(blocksHaveHeadingOne([nested])).toBe(true);
  });

  it('reports false for a page of paragraphs', () => {
    expect(blocksHaveHeadingOne([block(), block()])).toBe(false);
  });
});

describe('SEO field readers', () => {
  it('reads a non-empty title or description', () => {
    expect(hasSeoText({ title: 'กาแฟบ้านดอย' }, 'title')).toBe(true);
    expect(hasSeoText({ title: '   ' }, 'title')).toBe(false);
    expect(hasSeoText({}, 'title')).toBe(false);
    expect(hasSeoText(null, 'title')).toBe(false);
  });

  it('detects the noindex flag', () => {
    expect(isNoindex({ noindex: true })).toBe(true);
    expect(isNoindex({ noindex: false })).toBe(false);
    expect(isNoindex({})).toBe(false);
  });
});

describe('analytics helpers', () => {
  it('knows how many days each range covers', () => {
    expect(analyticsRangeDays('7d')).toBe(7);
    expect(analyticsRangeDays('30d')).toBe(30);
  });

  it('reports no trend when there is no baseline', () => {
    expect(analyticsChangePercent(10, 0)).toBeNull();
    expect(analyticsChangePercent(12, 10)).toBe(20);
    expect(analyticsChangePercent(8, 10)).toBe(-20);
  });

  it('labels known devices and passes unknown ones through', () => {
    expect(deviceLabel('mobile')).toBe('มือถือ');
    expect(deviceLabel(null)).toBe('ไม่ทราบอุปกรณ์');
    expect(deviceLabel('console')).toBe('console');
  });
});

describe('newsletter schemas', () => {
  it('accepts the two statuses only', () => {
    expect(isSubscriberStatus('active')).toBe(true);
    expect(isSubscriberStatus('unsubscribed')).toBe(true);
    expect(isSubscriberStatus('bounced')).toBe(false);
  });

  it('normalises the email when adding a subscriber', () => {
    const parsed = createSubscriberInputSchema.parse({ email: '  Somchai@Example.com ' });
    expect(parsed.email).toBe('somchai@example.com');
    expect(createSubscriberInputSchema.safeParse({ email: 'not-an-email' }).success).toBe(false);
  });

  it('exports CSV with a BOM, Thai headers and escaped cells', () => {
    const rows: Subscriber[] = [
      { id: 's1', email: 'somchai@example.com', status: 'active', createdAt: '2026-10-20' },
      { id: 's2', email: 'a"b@example.com', status: 'unsubscribed', createdAt: '2026-10-19' },
    ];

    const csv = subscribersToCsv(rows);
    expect(csv.startsWith('\uFEFF')).toBe(true);
    expect(csv).toContain('email,สถานะ,วันที่สมัคร');
    expect(csv).toContain('somchai@example.com,กำลังติดตาม,2026-10-20');
    expect(csv).toContain('"a""b@example.com",ยกเลิกรับข่าว');
  });
});

describe('app catalog', () => {
  it('has unique keys and a known category and permissions', () => {
    const keys = APP_CATALOG.map((app) => app.key);
    expect(new Set(keys).size).toBe(keys.length);

    for (const app of APP_CATALOG) {
      for (const permission of app.permissions) {
        expect(APP_PERMISSIONS).toContain(permission);
      }
    }
  });

  it('finds an app by key', () => {
    expect(findCatalogApp('seo-booster')?.name).toBe('ตัวช่วย SEO');
    expect(findCatalogApp('missing')).toBeUndefined();
  });

  it('defaults the install config to an empty object', () => {
    expect(installAppInputSchema.parse({})).toEqual({ config: {} });
  });
});

describe('seoMetaCandidates', () => {
  const health = (checks: SeoHealth['checks']): SeoHealth => ({
    score: 70,
    grade: 'ok',
    publishedCount: 3,
    checks,
  });

  it('collects each page once, with the fields that are still empty', () => {
    const candidates = seoMetaCandidates(
      health([
        {
          kind: 'missing_title',
          label: 'title',
          done: false,
          count: 1,
          impact: 'medium',
          href: '/content/page',
          items: [{ id: 'p2', title: 'บริการ' }],
        },
        {
          kind: 'missing_description',
          label: 'description',
          done: false,
          count: 2,
          impact: 'medium',
          href: '/content/page',
          items: [
            { id: 'p2', title: 'บริการ' },
            { id: 'p3', title: 'ติดต่อเรา' },
          ],
        },
        {
          kind: 'missing_alt',
          label: 'alt',
          done: false,
          count: 1,
          impact: 'low',
          href: '/content/media',
          items: [{ id: 'm1', title: 'logo.png' }],
        },
      ]),
    );

    expect(candidates).toEqual([
      { id: 'p2', title: 'บริการ', missingTitle: true, missingDescription: true },
      { id: 'p3', title: 'ติดต่อเรา', missingTitle: false, missingDescription: true },
    ]);
  });

  it('offers nothing when every page already has meta text', () => {
    expect(
      seoMetaCandidates(
        health([
          {
            kind: 'missing_title',
            label: 'title',
            done: true,
            count: 0,
            impact: 'medium',
            href: '/content/page',
            items: [],
          },
        ]),
      ),
    ).toEqual([]);
  });
});
