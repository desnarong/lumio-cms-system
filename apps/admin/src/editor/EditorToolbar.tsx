import { EDITOR_DEVICES, type EditorDevice } from '@lumio/blocks';
import type { ContentStatus } from '@lumio/shared';
import { Button, IconButton, useT, type MessageKey, type Translate } from '@lumio/ui';
import { cn } from '@lumio/ui/cn';
import type { EditorMode, SaveState } from './types.js';

const DEVICE_GLYPHS: Record<EditorDevice, string> = {
  mobile: '📱',
  tablet: '▭',
  desktop: '💻',
};

const DEVICE_LABEL_KEYS: Record<EditorDevice, MessageKey> = {
  mobile: 'editor.device.mobile',
  tablet: 'editor.device.tablet',
  desktop: 'editor.device.desktop',
};

const STATUS_LABELS: Partial<Record<ContentStatus, MessageKey>> = {
  draft: 'editor.status.draft',
  scheduled: 'editor.status.scheduled',
  published: 'editor.status.published',
  archived: 'editor.status.archived',
};

export interface EditorToolbarProps {
  title: string;
  status: ContentStatus;
  hasUnpublishedChanges: boolean;
  saveState: SaveState;
  device: EditorDevice;
  mode: EditorMode;
  canUndo: boolean;
  canRedo: boolean;
  publishing: boolean;
  onBack?: () => void;
  /** Signs out and returns to the login screen. */
  onSignOut?: () => void;
  onDeviceChange: (device: EditorDevice) => void;
  onModeChange: (mode: EditorMode) => void;
  onUndo: () => void;
  onRedo: () => void;
  onPublish: () => void;
  /** Opens the draft preview in a new tab; omit to hide the button. */
  onPreview?: () => void;
  /** Opens the version history drawer; omit to hide the button. */
  onOpenHistory?: () => void;
}

const saveLabel = (saveState: SaveState, t: Translate): string => {
  if (saveState === 'saving') return t('editor.save.saving');
  if (saveState === 'error') return t('editor.save.error');
  if (saveState === 'saved') return t('editor.save.saved');
  return t('editor.save.idle');
};

/** Floating toolbar from the editor wireframe (docs/design/06-design-system.md 6.7). */
export const EditorToolbar = ({
  title,
  status,
  hasUnpublishedChanges,
  saveState,
  device,
  mode,
  canUndo,
  canRedo,
  publishing,
  onBack,
  onSignOut,
  onDeviceChange,
  onModeChange,
  onUndo,
  onRedo,
  onPublish,
  onPreview,
  onOpenHistory,
}: EditorToolbarProps) => {
  const t = useT();

  return (
    <header className="editor-toolbar">
      <div className="editor-toolbar__group">
        {onBack ? (
          <IconButton aria-label={t('editor.back')} title={t('editor.back')} onClick={onBack}>
            ◀
          </IconButton>
        ) : null}
        <span className="editor-toolbar__title">{title}</span>
        <span className={cn('editor-status', `editor-status--${status}`)}>
          {t(STATUS_LABELS[status] ?? 'editor.status.draft')}
        </span>
        {status === 'published' && hasUnpublishedChanges ? (
          <span className="editor-status__hint">{t('editor.status.pendingChanges')}</span>
        ) : null}
      </div>

      <div className="editor-toolbar__group" role="group" aria-label={t('editor.toolbar.viewport')}>
        {EDITOR_DEVICES.map((item) => (
          <IconButton
            key={item.id}
            aria-label={t('editor.toolbar.viewAs', { device: t(DEVICE_LABEL_KEYS[item.id]) })}
            title={t(DEVICE_LABEL_KEYS[item.id])}
            aria-pressed={device === item.id}
            variant={device === item.id ? 'secondary' : 'ghost'}
            onClick={() => onDeviceChange(item.id)}
          >
            {DEVICE_GLYPHS[item.id]}
          </IconButton>
        ))}
      </div>

      <div
        className="editor-toolbar__group"
        role="group"
        aria-label={t('editor.toolbar.undoGroup')}
      >
        <IconButton
          aria-label={t('editor.toolbar.undo')}
          title={t('editor.toolbar.undoTitle')}
          disabled={!canUndo}
          onClick={onUndo}
        >
          ↶
        </IconButton>
        <IconButton
          aria-label={t('editor.toolbar.redo')}
          title={t('editor.toolbar.redoTitle')}
          disabled={!canRedo}
          onClick={onRedo}
        >
          ↷
        </IconButton>
      </div>

      <div className="editor-toolbar__group" role="group" aria-label={t('editor.toolbar.modeGroup')}>
        <Button
          size="sm"
          variant={mode === 'edit' ? 'secondary' : 'ghost'}
          aria-pressed={mode === 'edit'}
          onClick={() => onModeChange('edit')}
        >
          {t('editor.mode.edit')}
        </Button>
        <Button
          size="sm"
          variant={mode === 'design' ? 'secondary' : 'ghost'}
          aria-pressed={mode === 'design'}
          onClick={() => onModeChange('design')}
        >
          {t('editor.mode.design')}
        </Button>
      </div>

      <div className="editor-toolbar__group editor-toolbar__group--end">
        <span className="editor-save" aria-live="polite">
          {saveLabel(saveState, t)}
        </span>
        {onOpenHistory ? (
          <Button variant="ghost" size="sm" onClick={onOpenHistory}>
            {t('editor.toolbar.history')}
          </Button>
        ) : null}
        {onPreview ? (
          <Button variant="ghost" size="sm" onClick={onPreview}>
            {t('editor.toolbar.preview')}
          </Button>
        ) : null}
        {onSignOut ? (
          <Button variant="ghost" size="sm" onClick={onSignOut}>
            {t('shell.signOut')}
          </Button>
        ) : null}
        <Button variant="primary" onClick={onPublish} disabled={publishing}>
          {publishing ? t('editor.toolbar.publishing') : t('editor.toolbar.publish')}
        </Button>
      </div>
    </header>
  );
};
