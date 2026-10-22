import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it, vi } from 'vitest';
import type { BackupOverview } from '@lumio/shared';
import { MessagesProvider } from '@lumio/ui';
import { BackupScheduleView } from './SettingsPage.js';

const overview: BackupOverview = {
  schedule: { enabled: true, hour: 3, retentionDays: 14, lastRunAt: '2026-10-21T03:00:00.000Z' },
  items: [
    {
      id: 'b1',
      filename: 'baandoi-backup-2026-10-21.json',
      sizeBytes: 204_800,
      kind: 'auto',
      createdAt: '2026-10-21T03:00:00.000Z',
    },
  ],
};

const props = (overrides: Partial<Parameters<typeof BackupScheduleView>[0]> = {}) => ({
  overview,
  enabled: true,
  hour: 3,
  retentionDays: 14,
  saving: false,
  running: false,
  error: null,
  onEnabledChange: vi.fn(),
  onHourChange: vi.fn(),
  onRetentionChange: vi.fn(),
  onSave: vi.fn(),
  onRunNow: vi.fn(),
  onDownload: vi.fn(),
  ...overrides,
});

const render = (overrides: Partial<Parameters<typeof BackupScheduleView>[0]> = {}) =>
  renderToStaticMarkup(
    <MessagesProvider locale="th">
      <BackupScheduleView {...props(overrides)} />
    </MessagesProvider>,
  );

describe('BackupScheduleView', () => {
  it('shows the last run and the stored snapshots', () => {
    const html = render();
    expect(html).toContain('สำรองข้อมูลอัตโนมัติ');
    expect(html).toContain('สำรองล่าสุด');
    expect(html).toContain('baandoi-backup-2026-10-21.json');
    expect(html).toContain('200 KB');
  });

  it('disables saving until the schedule changes', () => {
    expect(render()).toMatch(/settings-backup-auto-save[^>]*disabled|ui-button--primary[^>]*disabled/);
    expect(render({ hour: 5 })).not.toMatch(/ui-button--primary[^>]*disabled/);
  });

  it('fills the empty state and shows an error', () => {
    const html = render({
      overview: { ...overview, items: [] },
      error: 'บันทึกตารางไม่สำเร็จ',
    });
    expect(html).toContain('ยังไม่มีไฟล์สำรอง');
    expect(html).toContain('บันทึกตารางไม่สำเร็จ');
  });
});
