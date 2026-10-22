import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it, vi } from 'vitest';
import type { AiProposal, SeoHealth, SeoMetaCandidate } from '@lumio/shared';
import { ToastProvider } from '@lumio/ui';
import { SeoView } from './SeoPage.js';
import { SeoMetaAssistant, seoMetaFromProposal } from './SeoMetaAssistant.js';
import type { SeoApi } from './api.js';

const proposal: AiProposal = {
  id: 'ai-1',
  action: 'seo',
  label: 'ชื่อเรื่องและคำอธิบาย',
  summary: 'ร่างให้ 2 ข้อความ',
  provider: 'local',
  changes: [
    { field: 'title', label: 'ชื่อเรื่อง', before: '', after: 'บริการซ่อมรถยนต์' },
    { field: 'description', label: 'คำอธิบาย', before: '', after: 'ซ่อมรถทุกยี่ห้อ' },
  ],
};

const candidates: SeoMetaCandidate[] = [
  { id: 'p2', title: 'บริการ', missingTitle: true, missingDescription: true },
  { id: 'p3', title: 'ติดต่อเรา', missingTitle: false, missingDescription: true },
];

const seoApi = (): SeoApi => ({
  getHealth: vi.fn(),
  getNotFound: vi.fn().mockResolvedValue({ items: [], total: 0 }),
  suggestMeta: vi.fn().mockResolvedValue(proposal),
  saveMeta: vi.fn().mockResolvedValue({ previous: { title: '', description: '' } }),
});

const renderAssistant = (
  overrides: Partial<Parameters<typeof SeoMetaAssistant>[0]> = {},
): string =>
  renderToStaticMarkup(
    <ToastProvider>
      <SeoMetaAssistant
        api={seoApi()}
        candidates={candidates}
        canManage
        onApplied={() => undefined}
        {...overrides}
      />
    </ToastProvider>,
  );

describe('seoMetaFromProposal', () => {
  it('picks the title and description out of the diff', () => {
    expect(seoMetaFromProposal(proposal)).toEqual({
      title: 'บริการซ่อมรถยนต์',
      description: 'ซ่อมรถทุกยี่ห้อ',
    });
  });

  it('falls back to empty text when the assistant skipped a field', () => {
    const onlyTitle: AiProposal = {
      ...proposal,
      changes: [{ field: 'title', label: 'ชื่อเรื่อง', before: '', after: 'ชื่อใหม่' }],
    };

    expect(seoMetaFromProposal(onlyTitle)).toEqual({ title: 'ชื่อใหม่', description: '' });
  });
});

describe('SeoMetaAssistant', () => {
  it('lists each page with the meta text it is missing', () => {
    const html = renderAssistant();

    expect(html).toContain('บริการ');
    expect(html).toContain('ติดต่อเรา');
    expect(html).toContain('ยังไม่มีชื่อเรื่องสำหรับค้นหา');
    expect(html).toContain('ยังไม่มีคำอธิบายหน้า');
    expect(html).toContain('ให้ผู้ช่วยแนะนำ');
  });

  it('says everything is done when no page needs meta text', () => {
    const html = renderAssistant({ candidates: [] });

    expect(html).toContain('ทุกหน้ามีชื่อเรื่องและคำอธิบายครบแล้ว');
    expect(html).not.toContain('ให้ผู้ช่วยแนะนำ');
  });

  it('hides the button but explains why for a read-only role', () => {
    const html = renderAssistant({ canManage: false });

    expect(html).not.toContain('ให้ผู้ช่วยแนะนำ');
    expect(html).toContain('ต้องมีสิทธิ์แก้ไขเนื้อหาจึงจะใช้ผู้ช่วยได้');
  });

  it('opens no diff dialog until a suggestion exists', () => {
    expect(renderAssistant()).not.toContain('ai-diff');
  });
});

describe('SeoView with the assistant', () => {
  const health: SeoHealth = {
    score: 78,
    grade: 'ok',
    publishedCount: 4,
    checks: [
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
  };

  it('places the assistant card after the checks', () => {
    const html = renderToStaticMarkup(
      <SeoView
        health={health}
        loading={false}
        error={null}
        onRetry={vi.fn()}
        onNavigate={vi.fn()}
        metaAssistant={<p>การ์ดผู้ช่วย</p>}
      />,
    );

    expect(html).toContain('การ์ดผู้ช่วย');
    expect(html.indexOf('seo-checks')).toBeLessThan(html.indexOf('การ์ดผู้ช่วย'));
  });

  it('keeps the report working without the assistant', () => {
    const html = renderToStaticMarkup(
      <SeoView
        health={health}
        loading={false}
        error={null}
        onRetry={vi.fn()}
        onNavigate={vi.fn()}
      />,
    );

    expect(html).toContain('ยังไม่มีคำอธิบายหน้า');
    expect(html).not.toContain('seo-meta');
  });
});
