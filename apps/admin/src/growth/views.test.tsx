import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it, vi } from 'vitest';
import type {
  AnalyticsSummary,
  AppStoreEntry,
  SeoHealth,
  SubscriberList,
} from '@lumio/shared';
import { AnalyticsView } from './AnalyticsPage.js';
import { AppsView } from './AppsPage.js';
import { NewsletterView } from './NewsletterPage.js';
import { SeoView } from './SeoPage.js';

const seoHealth = (overrides: Partial<SeoHealth> = {}): SeoHealth => ({
  score: 78,
  grade: 'ok',
  publishedCount: 4,
  checks: [
    {
      kind: 'not_published',
      label: 'ยังไม่มีหน้าเว็บที่เผยแพร่',
      done: true,
      count: 0,
      impact: 'high',
      href: '/content/page',
      items: [],
    },
    {
      kind: 'missing_description',
      label: 'ยังไม่มีคำอธิบายหน้า',
      done: false,
      count: 2,
      impact: 'medium',
      href: '/content/page',
      items: [{ id: 'p2', title: 'บริการ' }],
    },
  ],
  ...overrides,
});

const renderSeo = (overrides: Partial<SeoHealth> = {}): string =>
  renderToStaticMarkup(
    <SeoView
      health={seoHealth(overrides)}
      loading={false}
      error={null}
      onRetry={vi.fn()}
      onNavigate={vi.fn()}
    />,
  );

const analyticsSummary = (): AnalyticsSummary => ({
  range: '7d',
  days: 7,
  visitors: 240,
  pageviews: 500,
  previousVisitors: 200,
  changePercent: 20,
  series: [
    { date: '2026-10-20', visitors: 30, pageviews: 70 },
    { date: '2026-10-21', visitors: 40, pageviews: 90 },
  ],
  topPages: [{ label: '/', value: 210 }],
  topReferrers: [{ label: 'google.com', value: 120 }],
  devices: [{ label: 'มือถือ', value: 160 }],
});

const renderAnalytics = (): string =>
  renderToStaticMarkup(
    <AnalyticsView
      summary={analyticsSummary()}
      range="7d"
      loading={false}
      error={null}
      onRangeChange={vi.fn()}
      onRetry={vi.fn()}
    />,
  );

const subscriberList = (): SubscriberList => ({
  items: [
    { id: 's1', email: 'somchai@example.com', status: 'active', createdAt: '2026-10-20T09:00:00.000Z' },
    { id: 's2', email: 'malee@example.com', status: 'unsubscribed', createdAt: '2026-10-18T09:00:00.000Z' },
  ],
  cursor: null,
  total: 2,
  activeCount: 1,
});

const renderNewsletter = (canManage: boolean): string =>
  renderToStaticMarkup(
    <NewsletterView
      list={subscriberList()}
      loading={false}
      error={null}
      query=""
      status="all"
      adding={false}
      addError={null}
      canManage={canManage}
      onQueryChange={vi.fn()}
      onStatusChange={vi.fn()}
      onAdd={vi.fn()}
      onExport={vi.fn()}
      onToggle={vi.fn()}
      onRemove={vi.fn()}
      onRetry={vi.fn()}
    />,
  );

const storeEntries = (): AppStoreEntry[] => [
  {
    key: 'seo-booster',
    name: 'ตัวช่วย SEO',
    description: 'ตรวจคำอธิบายหน้าให้ทุกหน้า',
    category: 'marketing',
    permissions: ['contents:read', 'analytics:read'],
    installed: false,
    enabled: false,
  },
  {
    key: 'line-notify',
    name: 'แจ้งเตือนผ่าน LINE',
    description: 'เด้งข้อความใหม่เข้า LINE',
    category: 'communication',
    permissions: ['forms:read'],
    installed: true,
    enabled: true,
  },
];

const renderApps = (canManage: boolean): string =>
  renderToStaticMarkup(
    <AppsView
      entries={storeEntries()}
      loading={false}
      error={null}
      canManage={canManage}
      onInstall={vi.fn()}
      onToggle={vi.fn()}
      onUninstall={vi.fn()}
      onOpenSandbox={vi.fn()}
      onRetry={vi.fn()}
      onPreviewExternal={vi.fn()}
      onInstallExternal={vi.fn()}
    />,
  );

const JARGON = ['Post type', 'Slug', 'Permalink', 'Widget', 'Shortcode', 'Taxonomy'];

describe('SeoView', () => {
  it('shows the score, the grade and every check', () => {
    const html = renderSeo();
    expect(html).toContain('คะแนนสุขภาพเว็บ 78 จาก 100');
    expect(html).toContain('พอใช้');
    expect(html).toContain('ยังไม่มีหน้าเว็บที่เผยแพร่');
    expect(html).toContain('ยังไม่มีคำอธิบายหน้า');
  });

  it('links each failing check to where it is fixed', () => {
    const html = renderSeo();
    expect(html).toContain('href="/content/page"');
    expect(html).toContain('บริการ');
  });

  it('celebrates when there is nothing to fix', () => {
    const html = renderSeo({
      score: 100,
      grade: 'good',
      checks: seoHealth().checks.map((check) => ({ ...check, done: true, count: 0, items: [] })),
    });
    expect(html).toContain('พร้อมให้คนค้นหา');
  });

  it('uses business language instead of technical jargon', () => {
    const html = renderSeo();
    for (const word of JARGON) expect(html).not.toContain(word);
  });
});

describe('AnalyticsView', () => {
  it('shows the numbers with a trend and the range switch', () => {
    const html = renderAnalytics();
    expect(html).toContain('สถิติผู้เข้าชม');
    expect(html).toContain('240');
    expect(html).toContain('+20% เทียบกับช่วงก่อน');
    expect(html).toContain('7 วันล่าสุด');
    expect(html).toContain('30 วันล่าสุด');
  });

  it('renders a chart with an accessible label and the breakdown lists', () => {
    const html = renderAnalytics();
    expect(html).toContain('role="img"');
    expect(html).toContain('หน้าที่ถูกเปิดมากที่สุด');
    expect(html).toContain('google.com');
    expect(html).toContain('มือถือ');
  });

  it('uses business language instead of technical jargon', () => {
    const html = renderAnalytics();
    for (const word of JARGON) expect(html).not.toContain(word);
  });
});

describe('NewsletterView', () => {
  it('shows the follower count and the list', () => {
    const html = renderNewsletter(true);
    expect(html).toContain('ข่าวสาร');
    expect(html).toContain('ผู้ติดตาม 1 คน');
    expect(html).toContain('somchai@example.com');
    expect(html).toContain('กำลังติดตาม');
    expect(html).toContain('ยกเลิกรับข่าว');
  });

  it('lets a manager add, toggle and remove, and export the list', () => {
    const html = renderNewsletter(true);
    expect(html).toContain('เพิ่มผู้ติดตาม');
    expect(html).toContain('นำออก');
    expect(html).toContain('ดาวน์โหลดรายชื่อ (CSV)');
  });

  it('keeps a viewer read-only', () => {
    const html = renderNewsletter(false);
    expect(html).not.toContain('เพิ่มผู้ติดตาม');
    expect(html).not.toContain('นำออก');
    // Reading the list is still allowed.
    expect(html).toContain('somchai@example.com');
  });

  it('shows an empty state instead of a bare table', () => {
    const html = renderToStaticMarkup(
      <NewsletterView
        list={{ items: [], cursor: null, total: 0, activeCount: 0 }}
        loading={false}
        error={null}
        query=""
        status="all"
        adding={false}
        addError={null}
        canManage={false}
        onQueryChange={vi.fn()}
        onStatusChange={vi.fn()}
        onAdd={vi.fn()}
        onExport={vi.fn()}
        onToggle={vi.fn()}
        onRemove={vi.fn()}
        onRetry={vi.fn()}
      />,
    );
    expect(html).toContain('ยังไม่มีผู้ติดตาม');
  });

  it('uses business language instead of technical jargon', () => {
    const html = renderNewsletter(true);
    for (const word of JARGON) expect(html).not.toContain(word);
  });
});

describe('AppsView', () => {
  it('splits the store into installed and available sections', () => {
    const html = renderApps(true);
    expect(html).toContain('ติดตั้งแล้ว');
    expect(html).toContain('พร้อมติดตั้ง');
  });

  it('shows each app with the permissions it asks for', () => {
    const html = renderApps(true);
    expect(html).toContain('ตัวช่วย SEO');
    expect(html).toContain('อ่านหน้าเว็บและบทความ');
    expect(html).toContain('อ่านข้อความจากฟอร์ม');
  });

  it('offers install for new apps and a switch for installed ones', () => {
    const html = renderApps(true);
    expect(html).toContain('ติดตั้ง');
    expect(html).toContain('role="switch"');
    expect(html).toContain('ถอนการติดตั้ง');
  });

  it('offers a sandbox run for installed apps only', () => {
    const html = renderApps(true);
    expect(html).toContain('เปิดใน sandbox');
    // Only the installed app gets the sandbox button, so there is one per install.
    expect((html.match(/เปิดใน sandbox/g) ?? []).length).toBeGreaterThan(0);
  });

  it('keeps a viewer read-only', () => {
    const html = renderApps(false);
    expect(html).not.toContain('ถอนการติดตั้ง');
    expect(html).toContain('ติดตั้งแล้ว');
    expect(html).toContain('ยังไม่ได้ติดตั้ง');
  });

  it('uses business language instead of technical jargon', () => {
    const html = renderApps(true);
    for (const word of JARGON) expect(html).not.toContain(word);
  });
});

describe('AppsView external manifest', () => {
  it('lets an owner check and install an App from a manifest URL', () => {
    const html = renderApps(true);
    expect(html).toContain('เพิ่ม App จากนักพัฒนาภายนอก');
    expect(html).toContain('ที่อยู่ manifest');
    expect(html).toContain('ตรวจ manifest');
  });

  it('keeps the external install form away from a viewer', () => {
    const html = renderApps(false);
    expect(html).not.toContain('เพิ่ม App จากนักพัฒนาภายนอก');
  });
});
