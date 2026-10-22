import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it, vi } from 'vitest';
import { ToastProvider } from '@lumio/ui';
import type { ContentApi } from './api.js';
import { VersionHistoryPanel, formatMoment } from './VersionHistoryPanel.js';

const api = (overrides: Partial<ContentApi> = {}): ContentApi =>
  ({
    listPages: vi.fn(),
    list: vi.fn(),
    create: vi.fn(),
    update: vi.fn(),
    remove: vi.fn(),
    getContent: vi.fn(),
    saveBlocks: vi.fn(),
    publish: vi.fn(),
    listVersions: vi.fn().mockResolvedValue([]),
    getVersion: vi.fn(),
    createVersion: vi.fn(),
    restoreVersion: vi.fn(),
    restore: vi.fn(),
    ...overrides,
  }) as unknown as ContentApi;

const render = (props: Partial<Parameters<typeof VersionHistoryPanel>[0]> = {}): string =>
  renderToStaticMarkup(
    <ToastProvider>
      <VersionHistoryPanel
        api={api()}
        contentId="c1"
        open
        onClose={vi.fn()}
        onRestored={vi.fn()}
        {...props}
      />
    </ToastProvider>,
  );

describe('formatMoment', () => {
  it('formats an ISO timestamp as day/month/year plus time', () => {
    expect(formatMoment('2026-10-20T09:15:00.000Z')).toBe('20/10/2026 09:15');
  });

  it('returns an empty string for junk instead of throwing', () => {
    expect(formatMoment('ไม่ใช่วันที่')).toBe('');
  });
});

describe('VersionHistoryPanel', () => {
  it('explains where versions come from when there are none yet', () => {
    const html = render();
    expect(html).toContain('ประวัติเวอร์ชัน');
    expect(html).toContain('ยังไม่มีประวัติ');
    expect(html).toContain('บันทึกเวอร์ชันตอนนี้');
  });

  it('renders nothing while closed', () => {
    expect(render({ open: false })).not.toContain('ประวัติเวอร์ชัน');
  });

  it('keeps the publish button as the only primary action in the editor', () => {
    // The drawer offers save/restore as secondary buttons, so a page never has
    // two primary buttons (docs/design/04-ux.md 4.5).
    expect(render().match(/ui-button--primary/g)).toBeNull();
  });
});
