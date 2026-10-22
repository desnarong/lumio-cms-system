import { describe, expect, it } from 'vitest';
import { backupDue, readBackupSchedule } from './backup.js';

describe('readBackupSchedule', () => {
  it('falls back to safe defaults for a missing or broken blob', () => {
    expect(readBackupSchedule({})).toEqual({ enabled: false, hour: 3, retentionDays: 14 });
    expect(readBackupSchedule({ backup: { enabled: 'yes' } })).toEqual({
      enabled: false,
      hour: 3,
      retentionDays: 14,
    });
  });

  it('reads a saved schedule', () => {
    expect(readBackupSchedule({ backup: { enabled: true, hour: 5, retentionDays: 30 } })).toEqual({
      enabled: true,
      hour: 5,
      retentionDays: 30,
    });
  });
});

describe('backupDue', () => {
  const schedule = { enabled: true, hour: 3, retentionDays: 14 };

  it('is due only after the chosen hour', () => {
    expect(backupDue(schedule, null, new Date(2026, 9, 22, 2, 59))).toBe(false);
    expect(backupDue(schedule, null, new Date(2026, 9, 22, 3, 0))).toBe(true);
  });

  it('does not run twice on the same day', () => {
    expect(
      backupDue(schedule, new Date(2026, 9, 22, 3, 1), new Date(2026, 9, 22, 20, 0)),
    ).toBe(false);
    expect(
      backupDue(schedule, new Date(2026, 9, 21, 3, 1), new Date(2026, 9, 22, 3, 1)),
    ).toBe(true);
  });

  it('never runs when the owner turned it off', () => {
    expect(backupDue({ ...schedule, enabled: false }, null, new Date(2026, 9, 22, 12, 0))).toBe(
      false,
    );
  });
});
