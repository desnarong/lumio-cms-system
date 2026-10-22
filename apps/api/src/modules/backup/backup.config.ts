/**
 * Media files in a backup (docs/design/05-admin-ia.md "Backup & ประวัติเวอร์ชัน").
 *
 * The JSON backup is downloaded by a browser, so it cannot grow without bound:
 * original files ride along while they fit `BACKUP_MEDIA_MAX_BYTES` (default
 * 50 MB). Files over the budget keep their metadata in the backup and are
 * reported as skipped, instead of producing a file nobody can open.
 */

const MB = 1024 * 1024;

export const backupMediaMaxBytes = (env: NodeJS.ProcessEnv = process.env): number => {
  const value = Number(env.BACKUP_MEDIA_MAX_BYTES ?? String(50 * MB));
  return Number.isFinite(value) && value >= 0 ? Math.min(value, 500 * MB) : 50 * MB;
};

/** One image larger than this is metadata-only, even when the budget is free. */
export const backupMediaFileMaxBytes = (env: NodeJS.ProcessEnv = process.env): number => {
  const value = Number(env.BACKUP_MEDIA_FILE_MAX_BYTES ?? String(10 * MB));
  return Number.isFinite(value) && value > 0 ? Math.min(value, 100 * MB) : 10 * MB;
};
