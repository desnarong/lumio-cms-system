import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it, vi } from 'vitest';
import { buildUpdateStatus } from '@lumio/shared';
import { MessagesProvider } from '@lumio/ui';
import { VersionSummary } from './VersionPanel.js';

const render = (status: ReturnType<typeof buildUpdateStatus>): string =>
  renderToStaticMarkup(
    <MessagesProvider locale="th">
      <VersionSummary status={status} onCheck={vi.fn()} />
    </MessagesProvider>,
  );

describe('VersionSummary', () => {
  it('always shows the version this installation runs', () => {
    const html = render(buildUpdateStatus('0.23.1'));

    expect(html).toContain('เวอร์ชัน 0.23.1');
    expect(html).toContain('shell-version__check');
  });

  it('shows both versions and the release link when an update exists', () => {
    const html = render(
      buildUpdateStatus('0.23.1', {
        manifest: {
          version: '0.24.0',
          releaseUrl: 'https://github.com/desnarong/lumio-cms-system/releases/tag/v0.24.0',
          notes: 'เพิ่มระบบอัปเดต',
        },
        checkedAt: '2026-10-30T10:00:00.000Z',
        autoUpdate: true,
      }),
    );

    expect(html).toContain('มีเวอร์ชันใหม่ 0.24.0');
    expect(html).toContain('ตอนนี้ใช้ 0.23.1');
    expect(html).toContain('อัปเดตอัตโนมัติเปิดอยู่');
    expect(html).toContain('https://github.com/desnarong/lumio-cms-system/releases/tag/v0.24.0');
  });

  it('explains a failed check without hiding the current version', () => {
    const html = render(buildUpdateStatus('0.23.1', { error: 'unreachable' }));

    expect(html).toContain('เวอร์ชัน 0.23.1');
    expect(html).toContain('ยังตรวจหาอัปเดตไม่ได้');
  });
});
