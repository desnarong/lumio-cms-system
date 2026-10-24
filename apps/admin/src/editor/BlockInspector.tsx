import { PanelAccordion, registry, type EditorDevice } from '@lumio/blocks';
import type { BlockEditorMode, BlockNode } from '@lumio/shared';
import { Button, Switch, useT, type MessageKey } from '@lumio/ui';
import type { ReactNode } from 'react';

const DEVICE_LABEL_KEYS: Record<EditorDevice, MessageKey> = {
  mobile: 'editor.device.mobile',
  tablet: 'editor.device.tablet',
  desktop: 'editor.device.desktop',
};

export interface BlockInspectorProps {
  block: BlockNode | null;
  device: EditorDevice;
  panelMode: BlockEditorMode;
  onPanelModeChange: (panelMode: BlockEditorMode) => void;
  onChange: (path: string, value: unknown) => void;
  onDuplicate: () => void;
  onRemove: () => void;
  onToggleVisibility: () => void;
  /** The AI assistant, rendered above the block's own controls. */
  aiPanel?: ReactNode;
}

/**
 * Side panel from the wireframe: the selected block's own controls. It renders
 * the block's `Panel` from the registry, so a new block gets its editor for free.
 */
export const BlockInspector = ({
  block,
  device,
  panelMode,
  onPanelModeChange,
  onChange,
  onDuplicate,
  onRemove,
  onToggleVisibility,
  aiPanel,
}: BlockInspectorProps) => {
  const t = useT();

  if (!block) {
    return (
      <aside className="editor-inspector" aria-label={t('editor.inspectorLabel')}>
        <p className="editor-inspector__hint">{t('editor.inspectorHint')}</p>
        {aiPanel ? <div className="editor-inspector__ai">{aiPanel}</div> : null}
      </aside>
    );
  }

  const definition = registry.get(block.type);
  const Panel = definition?.Panel;
  const hidden = block.style.visibility[device] === false;
  const deviceLabel = t(DEVICE_LABEL_KEYS[device]);

  return (
    <aside className="editor-inspector" aria-label={t('editor.inspectorLabel')}>
      <header className="editor-inspector__header">
        <h2 className="editor-inspector__title">{definition?.label ?? block.type}</h2>
        <div className="editor-inspector__actions">
          <Button size="sm" variant="ghost" onClick={onDuplicate}>
            {t('editor.duplicate')}
          </Button>
          <Button size="sm" variant="ghost" onClick={onToggleVisibility}>
            {hidden
              ? t('editor.showOnDevice', { device: deviceLabel })
              : t('editor.hideOnDevice', { device: deviceLabel })}
          </Button>
          <Button size="sm" variant="danger" onClick={onRemove}>
            {t('common.delete')}
          </Button>
        </div>
      </header>

      <div className="editor-inspector__body">
        {aiPanel ? <div className="editor-inspector__ai">{aiPanel}</div> : null}
        {Panel ? (
          <PanelAccordion key={block.id}>
            <Panel
              props={block.props}
              style={block.style}
              mode={panelMode}
              onChange={onChange}
            />
          </PanelAccordion>
        ) : (
          <p className="editor-inspector__hint">{t('editor.noPanel')}</p>
        )}
      </div>

      <footer className="editor-inspector__footer">
        <Switch
          checked={panelMode === 'pro'}
          label={t('editor.proMode')}
          description={t('editor.proModeHint')}
          onChange={(checked) => onPanelModeChange(checked ? 'pro' : 'simple')}
        />
      </footer>
    </aside>
  );
};
