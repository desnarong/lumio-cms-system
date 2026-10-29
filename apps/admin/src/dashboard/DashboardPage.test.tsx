import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it, vi } from 'vitest';
import { SITE_CHECKLIST_LABELS, type DashboardSummary, type SiteChecklistKey } from '@lumio/shared';
import { MessagesProvider } from '@lumio/ui';
import { DashboardView, type DashboardViewProps } from './DashboardPage.js';

const keys = Object.keys(SITE_CHECKLIST_LABELS) as SiteChecklistKey[];

const summary = (overrides: Partial<DashboardSummary> = {}): DashboardSummary => ({
  site: {
    id: 's1',
    name: 'กาแฟบ้านดอย',
    subdomain: 'baandoi',
    url: 'https://baandoi.example.com',
    homeContentId: 'home-1',
  },
  stats: {
    visitors: { value: 1284, previous: 1146, changePercent: 12 },
    submissions: { value: 7, previous: 7, changePercent: 0 },
    subscribers: { value: 32, previous: 40, changePercent: -20 },
  },
  health: {
    score: 86,
    issues: [
      {
        id: 'seo_description',
        message: 'หน้า "บริการ" ยังไม่มีคำอธิบายหน้า',
        impact: 'medium',
        href: '/content/page',
      },
      {
        id: 'no_domain',
        message: 'ยังไม่ได้เชื่อมโดเมนของตัวเอง',
        impact: 'low',
        href: '/settings/domain',
      },
    ],
  },
  checklist: {
    items: keys.map((key) => ({
      key,
      label: SITE_CHECKLIST_LABELS[key],
      done: key === 'site_named' || key === 'style_chosen',
      href: '/design/style',
    })),
    doneCount: 2,
    total: 6,
    complete: false,
    dismissed: false,
  },
  ...overrides,
});

const props = (overrides: Partial<DashboardViewProps> = {}): DashboardViewProps => ({
  summary: summary(),
  error: null,
  onOpenEditor: vi.fn(),
  onNavigate: vi.fn(),
  onDismissChecklist: vi.fn(),
  ...overrides,
});

const render = (overrides: Partial<DashboardViewProps> = {}): string =>
  renderToStaticMarkup(<DashboardView {...props(overrides)} />);

const renderInEnglish = (overrides: Partial<DashboardViewProps> = {}): string =>
  renderToStaticMarkup(
    <MessagesProvider locale="en">
      <DashboardView {...props(overrides)} />
    </MessagesProvider>,
  );

describe('DashboardView languages', () => {
  it('renders the whole screen in English when the language is English', () => {
    const html = renderInEnglish();

    expect(html).toContain('Overview of กาแฟบ้านดอย');
    expect(html).toContain('Visitors today');
    expect(html).toContain('Site health');
    expect(html).toContain('Edit site');
    // Nothing may stay in Thai on a translated screen.
    expect(html).not.toContain('ผู้เข้าชมวันนี้');
    expect(html).not.toContain('สุขภาพเว็บ');
  });

  it('keeps the trend wording in the chosen language', () => {
    expect(renderInEnglish()).toContain('+12% vs yesterday');
    expect(render()).toContain('+12% เทียบกับเมื่อวาน');
  });
});

describe('DashboardView', () => {
  it('shows today numbers with a trend instead of a bare figure', () => {
    const html = render();
    expect(html).toContain('ผู้เข้าชมวันนี้');
    expect(html).toContain('1,284');
    expect(html).toContain('+12% เทียบกับเมื่อวาน');
    expect(html).toContain('-20% เทียบกับเมื่อวาน');
  });

  it('shows the health score and the things to fix, each linking somewhere', () => {
    const html = render();
    expect(html).toContain('คะแนนสุขภาพเว็บ 86 จาก 100');
    expect(html).toContain('หน้า &quot;บริการ&quot; ยังไม่มีคำอธิบายหน้า');
    expect(html).toContain('href="/settings/domain"');
  });

  it('says so when there is nothing to fix', () => {
    const html = render({
      summary: summary({ health: { score: 100, issues: [] } }),
    });
    expect(html).toContain('ไม่มีอะไรต้องแก้ตอนนี้');
  });

  it('shows the onboarding checklist with its progress', () => {
    const html = render();
    expect(html).toContain('เริ่มต้นใช้งาน 2/6');
    expect(html).toContain('เปลี่ยนข้อความหน้าแรก');
    expect(html).toContain('เชื่อมโดเมน');
  });

  it('hides the checklist once it is finished or dismissed', () => {
    const complete = render({
      summary: summary({
        checklist: { ...summary().checklist, doneCount: 6, complete: true },
      }),
    });
    expect(complete).not.toContain('เริ่มต้นใช้งาน');

    const dismissed = render({
      summary: summary({ checklist: { ...summary().checklist, dismissed: true } }),
    });
    expect(dismissed).not.toContain('เริ่มต้นใช้งาน');
  });

  it('keeps exactly one primary button', () => {
    expect(render().match(/ui-button--primary/g)).toHaveLength(1);
  });

  it('keeps one primary action and leaves creating to the top bar', () => {
    const html = render();

    expect(html).toContain('แก้เว็บ');
    // Creating and viewing the site live in the shell, not on every screen.
    expect(html).not.toContain('หน้าใหม่');
    expect(html).not.toContain('เขียนบทความ');
    expect(html).not.toContain('dashboard__shortcuts');
  });

  it('surfaces a failed reload without hiding the numbers', () => {
    const html = render({ error: 'เชื่อมต่อเซิร์ฟเวอร์ไม่สำเร็จ ลองอีกครั้ง' });
    expect(html).toContain('role="alert"');
    expect(html).toContain('1,284');
  });

  it('uses business language instead of technical jargon', () => {
    const html = render();
    for (const jargon of ['Post type', 'Slug', 'Permalink', 'Widget', 'Shortcode', 'Taxonomy']) {
      expect(html).not.toContain(jargon);
    }
  });
});
