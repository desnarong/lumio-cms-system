import { PanelAccordion, registry, type EditorDevice } from '@lumio/blocks';
import type { BlockEditorMode, BlockNode, TextLayout } from '@lumio/shared';
import { Button, Icon, Slider, Switch, TextField, useT, type MessageKey } from '@lumio/ui';
import type { ReactNode } from 'react';
import type { EditorTextField } from './types.js';

const DEFAULT_LAYOUT: TextLayout = { x: 0, y: 0, scale: 100 };

const HELP_KEYS: MessageKey[] = [
  'editor.helpClick',
  'editor.helpDrag',
  'editor.helpInsert',
  'editor.helpDesign',
];

interface TextLayoutControlsProps {
  field: EditorTextField;
  layout: TextLayout;
  onChange: (layout: TextLayout | undefined) => void;
}

/** Moves one editable text without moving the rest of its block. */
const TextLayoutControls = ({ field, layout, onChange }: TextLayoutControlsProps) => {
  const t = useT();
  const update = (patch: Partial<TextLayout>): void => {
    const next = { ...layout, ...patch };
    const untouched = next.x === 0 && next.y === 0 && next.scale === 100;
    onChange(untouched ? undefined : next);
  };
  const nudge = (dx: number, dy: number): void =>
    update({
      x: Math.min(600, Math.max(-600, layout.x + dx)),
      y: Math.min(600, Math.max(-600, layout.y + dy)),
    });

  return (
    <div className="editor-text-layout">
      <div className="editor-text-layout__head">
        <span className="editor-text-layout__label">{field.label}</span>
        <div
          className="editor-text-layout__nudge"
          role="group"
          aria-label={t('editor.textLayout.move', { field: field.label })}
        >
          <Button
            type="button"
            variant="ghost"
            size="sm"
            aria-label={t('editor.textLayout.up')}
            onClick={() => nudge(0, -8)}
          >
            <Icon name="arrow-up" size={14} />
          </Button>
          <Button
            type="button"
            variant="ghost"
            size="sm"
            aria-label={t('editor.textLayout.down')}
            onClick={() => nudge(0, 8)}
          >
            <Icon name="arrow-down" size={14} />
          </Button>
          <Button
            type="button"
            variant="ghost"
            size="sm"
            aria-label={t('editor.textLayout.left')}
            onClick={() => nudge(-8, 0)}
          >
            <Icon name="arrow-left" size={14} />
          </Button>
          <Button
            type="button"
            variant="ghost"
            size="sm"
            aria-label={t('editor.textLayout.right')}
            onClick={() => nudge(8, 0)}
          >
            <Icon name="arrow-right" size={14} />
          </Button>
        </div>
      </div>
      <div className="editor-text-layout__fields">
        <TextField
          label={t('editor.textLayout.x')}
          type="number"
          min={-600}
          max={600}
          value={String(layout.x)}
          onChange={(event) =>
            update({
              x: Math.min(600, Math.max(-600, Math.round(Number(event.target.value) || 0))),
            })
          }
        />
        <TextField
          label={t('editor.textLayout.y')}
          type="number"
          min={-600}
          max={600}
          value={String(layout.y)}
          onChange={(event) =>
            update({
              y: Math.min(600, Math.max(-600, Math.round(Number(event.target.value) || 0))),
            })
          }
        />
      </div>
      <Slider
        label={t('editor.textLayout.scale')}
        min={50}
        max={300}
        step={5}
        value={layout.scale}
        formatValue={(value) => `${value}%`}
        onChange={(value) => update({ scale: value })}
      />
      {layout.x !== 0 || layout.y !== 0 || layout.scale !== 100 ? (
        <Button type="button" variant="ghost" size="sm" onClick={() => onChange(undefined)}>
          {t('editor.textLayout.reset')}
        </Button>
      ) : null}
    </div>
  );
};

interface TextLayoutSectionProps {
  block: BlockNode;
  fields: readonly EditorTextField[];
  onChange: (path: string, layout: TextLayout | undefined) => void;
}

const TextLayoutTitle = () => <>{useT()('editor.textLayout.title')}</>;
const TextLayoutHint = () => <>{useT()('editor.textLayout.hint')}</>;

const TextLayoutSection = ({ block, fields, onChange }: TextLayoutSectionProps) => (
  <section className="editor-inspector__text-layouts">
    <h3 className="editor-inspector__subtitle">
      <TextLayoutTitle />
    </h3>
    <p className="editor-inspector__hint">
      <TextLayoutHint />
    </p>
    {fields.map((field) => (
      <TextLayoutControls
        key={field.path}
        field={field}
        layout={block.textLayouts?.[field.path] ?? DEFAULT_LAYOUT}
        onChange={(layout) => onChange(field.path, layout)}
      />
    ))}
  </section>
);

export interface BlockInspectorProps {
  block: BlockNode | null;
  device: EditorDevice;
  panelMode: BlockEditorMode;
  onPanelModeChange: (panelMode: BlockEditorMode) => void;
  onChange: (path: string, value: unknown) => void;
  /**
   * "จัดหน้าตา" mode: the per-text move controls belong to layout work, so they
   * only appear here while that mode is on.
   */
  layoutMode?: boolean;
  /** Editable texts of the selected block, used for per-text move controls. */
  fields?: readonly EditorTextField[];
  /** Stores one text's own position/size. */
  onTextLayoutChange?: (path: string, layout: TextLayout | undefined) => void;
  /** The AI assistant, rendered above the block's own controls. */
  aiPanel?: ReactNode;
  /** Page-level settings (a post's cover) shown while no block is selected. */
  metaPanel?: ReactNode;
}

/**
 * Side panel from the wireframe: the selected block's own controls. It renders
 * the block's `Panel` from the registry, so a new block gets its editor for free.
 * Duplicating, hiding and deleting live on the block itself (one place per
 * action), so this panel only holds settings.
 */
export const BlockInspector = ({
  block,
  device,
  panelMode,
  onPanelModeChange,
  onChange,
  layoutMode = false,
  fields = [],
  onTextLayoutChange,
  aiPanel,
  metaPanel,
}: BlockInspectorProps) => {
  const t = useT();

  if (!block) {
    return (
      <aside className="editor-inspector" aria-label={t('editor.inspectorLabel')}>
        {metaPanel ? <div className="editor-inspector__meta">{metaPanel}</div> : null}
        <div className="editor-inspector__help">
          <h2 className="editor-inspector__title">{t('editor.helpTitle')}</h2>
          <ul className="editor-inspector__help-list">
            {HELP_KEYS.map((key) => (
              <li key={key}>{t(key)}</li>
            ))}
          </ul>
        </div>
        {aiPanel ? <div className="editor-inspector__ai">{aiPanel}</div> : null}
      </aside>
    );
  }

  const definition = registry.get(block.type);
  const Panel = definition?.Panel;
  // Blocks saved before a field existed lack it; the renderer fills schema
  // defaults, so the panel must see the same props or it reads undefined.
  const parsed = definition?.schema.safeParse({
    version: block.version,
    props: block.props,
    style: block.style,
  });
  const panelProps = parsed?.success ? parsed.data.props : block.props;
  const hidden = block.style.visibility[device] === false;

  return (
    <aside className="editor-inspector" aria-label={t('editor.inspectorLabel')}>
      <header className="editor-inspector__header">
        <h2 className="editor-inspector__title">{definition?.label ?? block.type}</h2>
        {hidden ? <span className="chip chip--warning">{t('editor.hiddenBadge')}</span> : null}
      </header>

      <div className="editor-inspector__body">
        {aiPanel ? <div className="editor-inspector__ai">{aiPanel}</div> : null}
        {layoutMode && onTextLayoutChange && fields.length > 0 ? (
          <TextLayoutSection block={block} fields={fields} onChange={onTextLayoutChange} />
        ) : null}
        {Panel ? (
          <PanelAccordion key={block.id}>
            <Panel props={panelProps} style={block.style} mode={panelMode} onChange={onChange} />
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
