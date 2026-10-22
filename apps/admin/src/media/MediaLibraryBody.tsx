import { useEffect, useState, type ChangeEvent } from 'react';
import type {
  AiProposal,
  BulkUpdateMediaInput,
  FocalPoint,
  MediaCrop,
  MediaItem,
} from '@lumio/shared';
import { clampMediaCrop } from '@lumio/shared';
import {
  Banner,
  Button,
  EmptyState,
  Modal,
  Select,
  Skeleton,
  TextField,
  translateNow,
  useT,
} from '@lumio/ui';
import { AiDiffDialog } from '../ai/AiDiffDialog.js';
import type { AiApi } from '../ai/api.js';
import { ACCEPTED_UPLOAD_TYPES, UPLOAD_SIZE_LABEL } from './api.js';
import {
  focalPointFromPercent,
  focalPointPercent,
  objectPositionFor,
  type FocalPercent,
} from './focal-point.js';

const ALL_FOLDERS = '__all__';

export interface MediaLibraryBodyProps {
  items: MediaItem[];
  folders: string[];
  query: string;
  folder: string | null;
  loading: boolean;
  error: string | null;
  uploading: boolean;
  selectedId: string | null;
  /** Pick mode adds the primary action that hands the image to the caller. */
  pickMode?: boolean;
  onQueryChange: (value: string) => void;
  onFolderChange: (folder: string | null) => void;
  onSelect: (id: string) => void;
  onUpload: (files: readonly File[]) => void;
  onDelete: (item: MediaItem) => void;
  onSaveAlt: (item: MediaItem, alt: string) => void;
  /** Bulk edit: describe several images and/or move them to one folder. */
  onBulkUpdate?: (input: BulkUpdateMediaInput) => void;
  /** Saves where the picture should stay in frame; omit to hide the control. */
  onSaveFocalPoint?: (item: MediaItem, point: FocalPoint | null) => void;
  /** Saves the crop window; omit to hide the control. */
  onSaveCrop?: (item: MediaItem, crop: MediaCrop | null) => void;
  onConfirmPick?: (item: MediaItem) => void;
  onRetry?: () => void;
  /** The AI assistant; omit to hide the "ให้ผู้ช่วยคิดคำอธิบาย" button. */
  ai?: AiApi;
  /** Used inside dialogs, where the header is redundant. */
  compact?: boolean;
}

export const formatFileSize = (bytes: number | null): string => {
  if (bytes === null || bytes <= 0) return translateNow('media.unknownSize');
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
};

export const mediaStatusLabel = (item: MediaItem): string | null => {
  if (item.status === 'processing' || item.status === 'pending')
    return translateNow('media.statusProcessing');
  if (item.status === 'failed') return translateNow('media.statusFailed');
  return null;
};

/**
 * The media library body: search, folders, the grid, and the panel for the
 * selected image. It is fully controlled, so it renders and tests the same way
 * standalone, in a dialog, and inside the audit-free editor shell.
 */
export const MediaLibraryBody = ({
  items,
  folders,
  query,
  folder,
  loading,
  error,
  uploading,
  selectedId,
  pickMode = false,
  onQueryChange,
  onFolderChange,
  onSelect,
  onUpload,
  onDelete,
  onSaveAlt,
  onBulkUpdate,
  onSaveFocalPoint,
  onSaveCrop,
  onConfirmPick,
  onRetry,
  ai,
  compact = false,
}: MediaLibraryBodyProps) => {
  const t = useT();
  const selected = items.find((item) => item.id === selectedId) ?? null;
  const [altDraft, setAltDraft] = useState(selected?.alt ?? '');
  const [focalDraft, setFocalDraft] = useState<FocalPercent>(() =>
    focalPointPercent(selected?.focalPoint),
  );
  const [cropDraft, setCropDraft] = useState<MediaCrop>(() =>
    selected?.crop ? { ...selected.crop } : { x: 0, y: 0, width: 1, height: 1 },
  );
  const [proposal, setProposal] = useState<AiProposal | null>(null);
  const [aiBusy, setAiBusy] = useState(false);
  const [aiError, setAiError] = useState<string | null>(null);
  const [checkedIds, setCheckedIds] = useState<string[]>([]);
  const [bulkPanel, setBulkPanel] = useState<'alt' | 'folder' | null>(null);
  const [bulkAltDrafts, setBulkAltDrafts] = useState<Record<string, string>>({});
  const [bulkFolder, setBulkFolder] = useState('');
  const checkedItems = items.filter((item) => checkedIds.includes(item.id));

  useEffect(() => {
    setCheckedIds((current) => current.filter((id) => items.some((item) => item.id === id)));
  }, [items]);

  useEffect(() => {
    setAltDraft(selected?.alt ?? '');
    setFocalDraft(focalPointPercent(selected?.focalPoint));
    setCropDraft(selected?.crop ? { ...selected.crop } : { x: 0, y: 0, width: 1, height: 1 });
    setAiError(null);
  }, [selected?.id, selected?.alt, selected?.focalPoint, selected?.crop]);

  const changeCrop = (patch: Partial<MediaCrop>): void => {
    setCropDraft((current) => clampMediaCrop({ ...current, ...patch }));
  };

  const askAltText = async (item: MediaItem): Promise<void> => {
    if (!ai) return;
    setAiBusy(true);
    setAiError(null);
    try {
      const result = await ai.altText({
        mediaId: item.id,
        ...(item.folder ? { context: t('media.aiFolderContext', { folder: item.folder }) } : {}),
      });
      setProposal(result.proposal);
    } catch (cause) {
      setAiError(cause instanceof Error ? cause.message : t('media.aiError'));
    } finally {
      setAiBusy(false);
    }
  };

  /**
   * "Describe every image that has none": the assistant writes the text for the
   * images the current view shows, and each one is saved as its own edit, so the
   * work stays reviewable image by image (docs/design/09-ai-assistant.md 9.2).
   */
  const describeMissing = async (): Promise<void> => {
    if (!ai) return;
    const missing = items.filter((item) => (item.alt ?? '').trim().length === 0);
    if (missing.length === 0) {
      setAiError(t('media.allDescribed'));
      return;
    }

    setAiBusy(true);
    setAiError(null);
    try {
      const batch = await ai.altTextBatch({ mediaIds: missing.map((item) => item.id) });
      for (const entry of batch.items) {
        const target = missing.find((item) => item.id === entry.mediaId);
        if (target) onSaveAlt(target, entry.after);
      }
    } catch (cause) {
      setAiError(cause instanceof Error ? cause.message : t('media.aiError'));
    } finally {
      setAiBusy(false);
    }
  };

  const acceptAltText = (): void => {
    const after = proposal?.changes[0]?.after;
    setProposal(null);
    if (!selected || !after) return;
    setAltDraft(after);
    onSaveAlt(selected, after);
  };

  const handleFiles = (event: ChangeEvent<HTMLInputElement>): void => {
    const files = Array.from(event.target.files ?? []);
    if (files.length > 0) onUpload(files);
    event.target.value = '';
  };

  const toggleChecked = (id: string): void => {
    setCheckedIds((current) =>
      current.includes(id) ? current.filter((entry) => entry !== id) : [...current, id],
    );
  };

  const openBulkAlt = (): void => {
    setBulkAltDrafts(Object.fromEntries(checkedItems.map((item) => [item.id, item.alt ?? ''])));
    setBulkPanel('alt');
  };

  const applyBulkAlt = (): void => {
    if (!onBulkUpdate || checkedIds.length === 0) return;
    onBulkUpdate({
      ids: checkedIds,
      alt: checkedItems.map((item) => ({
        id: item.id,
        alt: (bulkAltDrafts[item.id] ?? '').trim() || null,
      })),
    });
    setBulkPanel(null);
    setCheckedIds([]);
  };

  const applyBulkFolder = (): void => {
    const next = bulkFolder.trim();
    if (!onBulkUpdate || checkedIds.length === 0 || next.length === 0) return;
    onBulkUpdate({ ids: checkedIds, folder: next });
    setBulkPanel(null);
    setCheckedIds([]);
  };

  const options = [
    { value: ALL_FOLDERS, label: t('media.allFolders') },
    ...folders.map((name) => ({ value: name, label: name })),
  ];

  return (
    <div className="media-library">
      {error ? (
        <Banner
          tone="danger"
          title={t('media.loadError')}
          action={
            onRetry ? (
              <Button size="sm" variant="secondary" onClick={onRetry}>
                {t('common.retry')}
              </Button>
            ) : undefined
          }
        >
          {error}
        </Banner>
      ) : null}

      <div className="media-library__toolbar">
        <TextField
          label={t('media.searchLabel')}
          value={query}
          placeholder={t('media.searchPlaceholder')}
          onChange={(event) => onQueryChange(event.target.value)}
        />
        <Select
          label={t('media.folderLabel')}
          value={folder ?? ALL_FOLDERS}
          options={options}
          onChange={(event) =>
            onFolderChange(event.target.value === ALL_FOLDERS ? null : event.target.value)
          }
        />
        <div className="media-library__upload">
          <label className="media-library__upload-label">
            <span className="ui-button ui-button--secondary ui-button--sm">
              {uploading ? t('media.uploading') : t('media.upload')}
            </span>
            <input
              type="file"
              accept={ACCEPTED_UPLOAD_TYPES}
              multiple
              disabled={uploading}
              aria-label={t('media.upload')}
              className="media-library__file"
              onChange={handleFiles}
            />
          </label>
          <p className="media-library__hint">
            {t('media.uploadHint', { limit: UPLOAD_SIZE_LABEL })}
          </p>
          {ai ? (
            <Button
              size="sm"
              variant="secondary"
              disabled={aiBusy || loading || items.length === 0}
              onClick={() => void describeMissing()}
            >
              {aiBusy ? t('media.aiThinking') : t('media.aiDescribeMissing')}
            </Button>
          ) : null}
        </div>
      </div>

      {onBulkUpdate && checkedIds.length > 0 ? (
        <div className="media-bulk" role="region" aria-label={t('media.bulkBarLabel')}>
          <span className="media-bulk__count">
            {t('media.bulkSelected', { count: checkedIds.length })}
          </span>
          <Button size="sm" variant="secondary" onClick={openBulkAlt}>
            {t('media.bulkAlt')}
          </Button>
          <Button size="sm" variant="secondary" onClick={() => setBulkPanel('folder')}>
            {t('media.bulkFolder')}
          </Button>
          <Button size="sm" variant="ghost" onClick={() => setCheckedIds([])}>
            {t('media.bulkClear')}
          </Button>
        </div>
      ) : null}

      <div className="media-library__content">
        <div className="media-library__grid-wrap">
          {loading ? (
            <div className="media-library__grid" aria-busy="true">
              <Skeleton shape="block" height={140} />
              <Skeleton shape="block" height={140} />
              <Skeleton shape="block" height={140} />
            </div>
          ) : items.length === 0 ? (
            <EmptyState title={t('media.emptyTitle')} description={t('media.emptyHint')} />
          ) : (
            <ul className="media-library__grid" aria-label={t('media.gridLabel')}>
              {items.map((item) => (
                <li key={item.id} className="media-card-slot">
                  {onBulkUpdate ? (
                    <input
                      type="checkbox"
                      className="media-card__check"
                      checked={checkedIds.includes(item.id)}
                      aria-label={t('media.bulkSelectOne', {
                        name: item.filename ?? t('media.noFilename'),
                      })}
                      onChange={() => toggleChecked(item.id)}
                    />
                  ) : null}
                  <button
                    type="button"
                    className={`media-card${item.id === selectedId ? ' media-card--active' : ''}`}
                    aria-pressed={item.id === selectedId}
                    onClick={() => onSelect(item.id)}
                  >
                    <span className="media-card__preview">
                      <img src={item.url} alt={item.alt ?? ''} loading="lazy" />
                    </span>
                    <span className="media-card__meta">
                      <span className="media-card__name">
                        {item.filename ?? t('media.noFilename')}
                      </span>
                      <span className="media-card__size">{formatFileSize(item.sizeBytes)}</span>
                    </span>
                    {mediaStatusLabel(item) ? (
                      <span className="media-card__badge">{mediaStatusLabel(item)}</span>
                    ) : null}
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>

        {selected ? (
          <aside className="media-library__inspector" aria-label={t('media.inspectorLabel')}>
            <h3 className="media-library__inspector-title">{t('media.inspectorLabel')}</h3>
            <p className="media-library__inspector-name">
              {selected.filename ?? t('media.noFilename')}
            </p>
            <p className="media-library__inspector-meta">
              {[
                selected.width && selected.height ? `${selected.width} × ${selected.height}` : null,
                formatFileSize(selected.sizeBytes),
                selected.folder ?? t('media.noFolder'),
              ]
                .filter(Boolean)
                .join(' · ')}
            </p>
            <TextField
              label={t('media.altLabel')}
              value={altDraft}
              hint={t('media.altHint')}
              onChange={(event) => setAltDraft(event.target.value)}
            />
            <div className="media-library__inspector-actions">
              <Button
                size="sm"
                variant="secondary"
                disabled={altDraft === (selected.alt ?? '')}
                onClick={() => onSaveAlt(selected, altDraft)}
              >
                {t('media.saveAlt')}
              </Button>
              {ai ? (
                <Button
                  size="sm"
                  variant="ghost"
                  disabled={aiBusy}
                  onClick={() => void askAltText(selected)}
                >
                  {aiBusy ? t('media.aiDescribing') : t('media.aiSuggestAlt')}
                </Button>
              ) : null}
              <Button size="sm" variant="ghost" onClick={() => onDelete(selected)}>
                {t('media.deleteImage')}
              </Button>
            </div>
            {onSaveFocalPoint && selected.status === 'ready' ? (
              <div className="media-library__focus">
                <p className="media-library__focus-title">{t('media.focalTitle')}</p>
                <img
                  className="media-library__focus-preview"
                  src={selected.url}
                  alt=""
                  style={{ objectPosition: objectPositionFor(focalPointFromPercent(focalDraft)) }}
                />
                <label className="media-library__focus-slider">
                  <span>{t('media.focalHorizontal')}</span>
                  <input
                    type="range"
                    min={0}
                    max={100}
                    value={focalDraft.x}
                    onChange={(event) =>
                      setFocalDraft((current) => ({ ...current, x: Number(event.target.value) }))
                    }
                  />
                </label>
                <label className="media-library__focus-slider">
                  <span>{t('media.focalVertical')}</span>
                  <input
                    type="range"
                    min={0}
                    max={100}
                    value={focalDraft.y}
                    onChange={(event) =>
                      setFocalDraft((current) => ({ ...current, y: Number(event.target.value) }))
                    }
                  />
                </label>
                <p className="media-library__hint">{t('media.focalHint')}</p>
                <div className="media-library__focus-actions">
                  <Button
                    size="sm"
                    variant="secondary"
                    onClick={() => onSaveFocalPoint(selected, focalPointFromPercent(focalDraft))}
                  >
                    {t('media.focalSave')}
                  </Button>
                  <Button
                    size="sm"
                    variant="ghost"
                    disabled={selected.focalPoint === null}
                    onClick={() => onSaveFocalPoint(selected, null)}
                  >
                    {t('media.focalReset')}
                  </Button>
                </div>
              </div>
            ) : null}
            {onSaveCrop && selected.status === 'ready' && selected.mime !== 'image/gif' ? (
              <div className="media-library__focus">
                <p className="media-library__focus-title">{t('media.cropTitle')}</p>
                <div className="media-crop-preview">
                  <img src={selected.url} alt="" />
                  <span
                    className="media-crop-window"
                    style={{
                      left: `${cropDraft.x * 100}%`,
                      top: `${cropDraft.y * 100}%`,
                      width: `${cropDraft.width * 100}%`,
                      height: `${cropDraft.height * 100}%`,
                    }}
                  />
                </div>
                <label className="media-library__focus-slider">
                  <span>
                    {t('media.cropLeft')} {Math.round(cropDraft.x * 100)}%
                  </span>
                  <input
                    type="range"
                    min={0}
                    max={100}
                    value={Math.round(cropDraft.x * 100)}
                    onChange={(event) => changeCrop({ x: Number(event.target.value) / 100 })}
                  />
                </label>
                <label className="media-library__focus-slider">
                  <span>
                    {t('media.cropTop')} {Math.round(cropDraft.y * 100)}%
                  </span>
                  <input
                    type="range"
                    min={0}
                    max={100}
                    value={Math.round(cropDraft.y * 100)}
                    onChange={(event) => changeCrop({ y: Number(event.target.value) / 100 })}
                  />
                </label>
                <label className="media-library__focus-slider">
                  <span>
                    {t('media.cropWidth')} {Math.round(cropDraft.width * 100)}%
                  </span>
                  <input
                    type="range"
                    min={5}
                    max={100}
                    value={Math.round(cropDraft.width * 100)}
                    onChange={(event) => changeCrop({ width: Number(event.target.value) / 100 })}
                  />
                </label>
                <label className="media-library__focus-slider">
                  <span>
                    {t('media.cropHeight')} {Math.round(cropDraft.height * 100)}%
                  </span>
                  <input
                    type="range"
                    min={5}
                    max={100}
                    value={Math.round(cropDraft.height * 100)}
                    onChange={(event) => changeCrop({ height: Number(event.target.value) / 100 })}
                  />
                </label>
                <p className="media-library__hint">{t('media.cropHint')}</p>
                <div className="media-library__focus-actions">
                  <Button
                    size="sm"
                    variant="secondary"
                    onClick={() => onSaveCrop(selected, clampMediaCrop(cropDraft))}
                  >
                    {t('media.cropSave')}
                  </Button>
                  <Button
                    size="sm"
                    variant="ghost"
                    disabled={!selected.crop}
                    onClick={() => onSaveCrop(selected, null)}
                  >
                    {t('media.cropReset')}
                  </Button>
                </div>
              </div>
            ) : null}
            {aiError ? (
              <p className="media-library__hint" role="alert">
                {aiError}
              </p>
            ) : null}
          </aside>
        ) : null}
      </div>

      {pickMode ? (
        <footer className="media-library__footer">
          <Button
            disabled={!selected}
            onClick={() => selected && onConfirmPick?.(selected)}
            data-testid="media-pick-confirm"
          >
            {t('media.useImage')}
          </Button>
        </footer>
      ) : null}

      {compact ? null : <p className="media-library__footer-note">{t('media.footerNote')}</p>}

      <Modal
        open={bulkPanel === 'alt'}
        size="lg"
        title={t('media.bulkAltTitle', { count: checkedIds.length })}
        description={t('media.bulkAltHint')}
        onClose={() => setBulkPanel(null)}
        footer={
          <div className="editor-modal-actions">
            <Button variant="ghost" onClick={() => setBulkPanel(null)}>
              {t('common.cancel')}
            </Button>
            <Button onClick={applyBulkAlt}>{t('media.bulkAltSave')}</Button>
          </div>
        }
      >
        <div className="media-bulk__list">
          {checkedItems.map((item) => (
            <div className="media-bulk__row" key={item.id}>
              <img className="media-bulk__thumb" src={item.url} alt="" />
              <TextField
                label={item.filename ?? t('media.noFilename')}
                value={bulkAltDrafts[item.id] ?? ''}
                maxLength={300}
                onChange={(event) =>
                  setBulkAltDrafts((current) => ({ ...current, [item.id]: event.target.value }))
                }
              />
            </div>
          ))}
        </div>
      </Modal>

      <Modal
        open={bulkPanel === 'folder'}
        title={t('media.bulkFolderTitle', { count: checkedIds.length })}
        description={t('media.bulkFolderHint')}
        onClose={() => setBulkPanel(null)}
        footer={
          <div className="editor-modal-actions">
            <Button variant="ghost" onClick={() => setBulkPanel(null)}>
              {t('common.cancel')}
            </Button>
            <Button disabled={bulkFolder.trim().length === 0} onClick={applyBulkFolder}>
              {t('media.bulkFolderSave')}
            </Button>
          </div>
        }
      >
        <TextField
          label={t('media.bulkFolderLabel')}
          value={bulkFolder}
          maxLength={60}
          placeholder={folders[0] ?? ''}
          onChange={(event) => setBulkFolder(event.target.value)}
        />
        <p className="media-library__hint">
          {t('media.bulkFolderExisting', {
            folders: folders.length > 0 ? folders.join(' · ') : t('media.noFolder'),
          })}
        </p>
      </Modal>

      <AiDiffDialog
        proposal={proposal}
        onAccept={acceptAltText}
        onReject={() => setProposal(null)}
      />
    </div>
  );
};
