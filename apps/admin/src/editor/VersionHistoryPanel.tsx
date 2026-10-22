import { useCallback, useEffect, useState } from 'react';
import { BlockTreeRenderer } from '@lumio/blocks';
import type { ContentVersionDetail, ContentVersionSummary } from '@lumio/shared';
import {
  Button,
  Drawer,
  EmptyState,
  Skeleton,
  TextField,
  useT,
  useToast,
  type Translate,
} from '@lumio/ui';
import type { ContentApi } from './api.js';

export interface VersionHistoryPanelProps {
  api: ContentApi;
  contentId: string;
  open: boolean;
  onClose: () => void;
  /** Reloads the editor after a version is restored into the draft. */
  onRestored: () => void;
}

/** `2026-10-20T09:00:00.000Z` → `20/10/2026 09:00` (stable across ICU builds). */
export const formatMoment = (iso: string): string => {
  const [date, time] = iso.split('T');
  const [year, month, day] = (date ?? '').split('-');
  const clock = (time ?? '').slice(0, 5);
  return year && month && day ? `${day}/${month}/${year} ${clock}` : '';
};

const errorMessage = (error: unknown, t: Translate): string =>
  error instanceof Error ? error.message : t('common.genericError');

/**
 * Version history drawer (docs/design/05-admin-ia.md 5.1 "Backup & ประวัติเวอร์ชัน").
 * Every publish snapshots the draft, so the list reads as the page's story: who
 * saved it, when, and how many sections it had. Any version can be previewed and
 * restored into the draft.
 */
export const VersionHistoryPanel = ({
  api,
  contentId,
  open,
  onClose,
  onRestored,
}: VersionHistoryPanelProps) => {
  const t = useT();
  const toast = useToast();
  const [versions, setVersions] = useState<ContentVersionSummary[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [preview, setPreview] = useState<ContentVersionDetail | null>(null);
  const [busy, setBusy] = useState(false);
  const [note, setNote] = useState('');

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      setVersions(await api.listVersions(contentId));
    } catch (loadError) {
      setError(errorMessage(loadError, t));
    } finally {
      setLoading(false);
    }
  }, [api, contentId, t]);

  useEffect(() => {
    if (!open) return;
    setPreview(null);
    void load();
  }, [open, load]);

  const previewVersion = async (version: ContentVersionSummary): Promise<void> => {
    try {
      setPreview(await api.getVersion(contentId, version.id));
    } catch (previewError) {
      toast.push({ tone: 'danger', title: errorMessage(previewError, t) });
    }
  };

  const restoreVersion = async (version: ContentVersionSummary): Promise<void> => {
    setBusy(true);
    try {
      await api.restoreVersion(contentId, version.id);
      toast.push({
        tone: 'success',
        title: t('editor.history.restored'),
        description: t('editor.history.restoredBody'),
      });
      setPreview(null);
      onRestored();
      await load();
    } catch (restoreError) {
      toast.push({ tone: 'danger', title: errorMessage(restoreError, t) });
    } finally {
      setBusy(false);
    }
  };

  const saveVersion = async (): Promise<void> => {
    setBusy(true);
    try {
      const saved = await api.createVersion(contentId, note.trim() ? { note: note.trim() } : {});
      setNote('');
      toast.push({
        tone: 'success',
        title: t('editor.history.saved'),
        description: saved.note ?? '',
      });
      await load();
    } catch (saveError) {
      toast.push({ tone: 'danger', title: errorMessage(saveError, t) });
    } finally {
      setBusy(false);
    }
  };

  return (
    <Drawer
      open={open}
      size="md"
      title={t('editor.history.title')}
      onClose={onClose}
      footer={
        <div className="version-panel__save">
          <TextField
            label={t('editor.history.saveNow')}
            placeholder={t('editor.history.savePlaceholder')}
            value={note}
            onChange={(event) => setNote(event.target.value)}
          />
          <Button variant="secondary" disabled={busy} onClick={() => void saveVersion()}>
            {t('common.save')}
          </Button>
        </div>
      }
    >
      {loading ? (
        <div className="version-panel__loading" aria-busy="true">
          <Skeleton shape="block" height={56} />
          <Skeleton shape="block" height={56} />
          <Skeleton shape="block" height={56} />
        </div>
      ) : error ? (
        <EmptyState
          tone="error"
          title={t('editor.history.loadError')}
          description={error}
          action={
            <Button variant="secondary" onClick={() => void load()}>
              {t('common.retry')}
            </Button>
          }
        />
      ) : versions.length === 0 ? (
        <EmptyState
          illustration={<span aria-hidden="true">🕘</span>}
          title={t('editor.history.empty')}
          description={t('editor.history.emptyHint')}
        />
      ) : (
        <ul className="version-list">
          {versions.map((version) => (
            <li key={version.id} className="version-row">
              <div className="version-row__main">
                <span className="version-row__note">
                  {version.note ?? t('editor.history.version')}
                </span>
                <span className="version-row__meta">
                  {formatMoment(version.createdAt)} ·{' '}
                  {version.authorName ?? t('editor.history.unknownAuthor')} ·{' '}
                  {t('editor.history.sections', { count: version.blockCount })}
                </span>
              </div>
              <div className="version-row__actions">
                <Button variant="ghost" size="sm" onClick={() => void previewVersion(version)}>
                  {t('editor.history.view')}
                </Button>
                <Button
                  variant="secondary"
                  size="sm"
                  disabled={busy}
                  onClick={() => void restoreVersion(version)}
                >
                  {t('editor.history.restore')}
                </Button>
              </div>
            </li>
          ))}
        </ul>
      )}

      {preview ? (
        <section className="version-preview" aria-label={t('editor.history.preview')}>
          <header className="version-preview__header">
            <div>
              <h3 className="version-preview__title">{t('editor.history.preview')}</h3>
              <p className="version-preview__meta">
                {formatMoment(preview.createdAt)} ·{' '}
                {t('editor.history.sections', { count: preview.blockCount })}
              </p>
            </div>
            <div className="version-preview__actions">
              <Button variant="ghost" size="sm" onClick={() => setPreview(null)}>
                {t('editor.history.closePreview')}
              </Button>
              <Button
                variant="secondary"
                size="sm"
                disabled={busy}
                onClick={() => void restoreVersion(preview)}
              >
                {t('editor.history.restoreThis')}
              </Button>
            </div>
          </header>
          <div className="version-preview__canvas">
            <BlockTreeRenderer blocks={preview.blocks} />
          </div>
        </section>
      ) : null}
    </Drawer>
  );
};
