import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it, vi } from 'vitest';
import type { ContentSummary } from '@lumio/shared';
import { MessagesProvider } from '@lumio/ui';
import { ContentView, formatDate, type ContentViewProps } from './ContentListPage.js';

const page = (overrides: Partial<ContentSummary> = {}): ContentSummary => ({
  id: 'c1',
  type: 'page',
  title: 'เมนูร้าน',
  slug: 'menu',
  status: 'published',
  locale: 'th',
  translationGroupId: 'c1',
  excerpt: null,
  revision: 2,
  updatedAt: '2026-10-20T09:00:00.000Z',
  publishedAt: '2026-10-20T09:00:00.000Z',
  archivedAt: null,
  ...overrides,
});

const props = (overrides: Partial<ContentViewProps> = {}): ContentViewProps => ({
  kind: 'page',
  items: [page()],
  query: '',
  status: 'all',
  locale: 'all',
  locales: ['th'],
  loading: false,
  loadingMore: false,
  error: null,
  cursor: null,
  onQueryChange: vi.fn(),
  onStatusChange: vi.fn(),
  onLocaleChange: vi.fn(),
  onReload: vi.fn(),
  onLoadMore: vi.fn(),
  onArchive: vi.fn(),
  onRestore: vi.fn(),
  onPurge: vi.fn(),
  onCreate: vi.fn(),
  onOpenEditor: vi.fn(),
  ...overrides,
});

const render = (overrides: Partial<ContentViewProps> = {}): string =>
  renderToStaticMarkup(<ContentView {...props(overrides)} />);

const renderInEnglish = (overrides: Partial<ContentViewProps> = {}): string =>
  renderToStaticMarkup(
    <MessagesProvider locale="en">
      <ContentView {...props(overrides)} />
    </MessagesProvider>,
  );

describe('formatDate', () => {
  it('formats an ISO timestamp as a Thai-style date', () => {
    expect(formatDate('2026-10-20T09:00:00.000Z')).toBe('20/10/2026');
  });

  it('returns an empty string for junk instead of throwing', () => {
    expect(formatDate('ไม่ใช่วันที่')).toBe('');
  });
});

describe('ContentView languages', () => {
  it('renders the list in English when the language is English', () => {
    const html = renderInEnglish({
      items: [page({ status: 'archived', archivedAt: '2026-10-18T00:00:00.000Z' })],
    });

    expect(html).toContain('Pages');
    expect(html).toContain('Search');
    expect(html).toContain('Restore');
    expect(html).toContain('Delete forever');
    expect(html).not.toContain('กู้คืน');
  });
});

describe('ContentView', () => {
  it('lists rows with status and a link, and one primary action', () => {
    const html = render();
    expect(html).toContain('เมนูร้าน');
    expect(html).toContain('/menu');
    expect(html).toContain('เผยแพร่แล้ว');
    expect(html).toContain('20/10/2026');
    expect(html.match(/ui-button--primary/g)).toHaveLength(1);
  });

  it('offers a load-more button only when there is a next page', () => {
    expect(render({ cursor: 'next' })).toContain('ดูเพิ่มเติม');
    expect(render()).not.toContain('ดูเพิ่มเติม');
  });

  it('invites the user to create the first item when the list is empty', () => {
    const html = render({ items: [] });
    expect(html).toContain('ยังไม่มีหน้าเว็บ');
    expect(html).toContain('หน้าใหม่');
  });

  it('explains an empty result caused by a filter', () => {
    expect(render({ items: [], query: 'กาแฟ' })).toContain('ไม่พบรายการที่ตรงกัน');
  });

  it('shows skeletons while loading and a retry when it fails', () => {
    expect(render({ loading: true })).toContain('ui-skeleton');
    const failed = render({ error: 'เชื่อมต่อเซิร์ฟเวอร์ไม่สำเร็จ ลองอีกครั้ง' });
    expect(failed).toContain('เปิดรายการไม่สำเร็จ');
    expect(failed).toContain('ลองอีกครั้ง');
  });

  it('labels posts differently from pages', () => {
    expect(render({ kind: 'post', items: [] })).toContain('ยังไม่มีบทความ');
  });

  it('swaps in restore and permanent delete for trashed rows', () => {
    const html = render({
      items: [page({ status: 'archived', archivedAt: '2026-10-18T00:00:00.000Z' })],
    });
    expect(html).toContain('กู้คืน');
    expect(html).toContain('ลบถาวร');
    expect(html).toContain('ลบอัตโนมัติในอีก');
    expect(html).not.toContain('ย้ายไปถังขยะ');
  });

  it('uses business language instead of technical jargon', () => {
    const html = render();
    for (const jargon of ['Post type', 'Slug', 'Permalink']) {
      expect(html).not.toContain(jargon);
    }
  });

  it('offers a language filter and a row badge only for multi-language sites', () => {
    const single = render();
    expect(single).not.toContain('ทุกภาษา');
    expect(single).not.toContain('content-row__locale');

    const multi = render({ locales: ['th', 'en'] });
    expect(multi).toContain('ทุกภาษา');
    expect(multi).toContain('content-row__locale');
    expect(multi).toContain('ไทย');
  });

  it('treats a language filter as an active filter for the empty state', () => {
    expect(render({ items: [], locales: ['th', 'en'], locale: 'en' })).toContain(
      'ไม่พบรายการที่ตรงกัน',
    );
  });
});
