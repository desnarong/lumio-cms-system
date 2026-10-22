import {
  Fragment,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type DragEvent as ReactDragEvent,
  type KeyboardEvent as ReactKeyboardEvent,
} from 'react';
import {
  BlockRenderer,
  attachInlineEditing,
  deviceWidth,
  registry,
  resolveDropIndex,
  type BlockIndexPath,
  type EditorDevice,
} from '@lumio/blocks';
import type { BlockNode, BlockTree, PublicForm, SectionTemplate } from '@lumio/shared';
import { IconButton, useT } from '@lumio/ui';
import { cn } from '@lumio/ui/cn';
import { labelForPath } from './fields.js';
import { SlashMenu } from './SlashMenu.js';
import type { EditorTextField } from './types.js';

export interface BlockCanvasProps {
  blocks: BlockTree;
  selectedId: string | null;
  device: EditorDevice;
  draggingId: string | null;
  dropIndex: number | null;
  onSelect: (id: string | null) => void;
  onTextChange: (id: string, path: string, value: string) => void;
  onInsert: (type: string, index: number) => void;
  onDuplicate: (id: string) => void;
  onRemove: (id: string) => void;
  onToggleVisibility: (id: string) => void;
  /** Saves this block as a reusable section; hidden when omitted. */
  onSaveAsTemplate?: (id: string) => void;
  /** Library of saved sections offered in the "/" menu. */
  sections?: SectionTemplate[];
  onInsertSection?: (sectionId: string, index: number) => void;
  /** Contact forms the page can render; passed to blocks that need them. */
  forms?: readonly PublicForm[];
  onMove: (from: BlockIndexPath, to: BlockIndexPath) => void;
  onDragStart: (id: string) => void;
  onDropIndex: (index: number | null) => void;
  onDragEnd: () => void;
  /** Text fields of the selected block, read back from the rendered markup. */
  onFields?: (blockId: string, fields: EditorTextField[]) => void;
}

interface BlockRegionProps {
  block: BlockNode;
  index: number;
  device: EditorDevice;
  selected: boolean;
  dragging: boolean;
  onSelect: () => void;
  onTextChange: (path: string, value: string) => void;
  onDuplicate: () => void;
  onRemove: () => void;
  onToggleVisibility: () => void;
  onSaveAsTemplate?: () => void;
  onDragStart: () => void;
  onDragEnd: () => void;
  forms?: readonly PublicForm[];
}

/**
 * One block on the page. The block itself stays a plain `BlockRenderer`; inline
 * text editing is attached to its DOM afterwards, which is exactly how the
 * public site renders it (no block JavaScript).
 */
const BlockRegion = ({
  block,
  index,
  device,
  selected,
  dragging,
  onSelect,
  onTextChange,
  onDuplicate,
  onRemove,
  onToggleVisibility,
  onSaveAsTemplate,
  onDragStart,
  onDragEnd,
  forms,
}: BlockRegionProps) => {
  const t = useT();
  const contentRef = useRef<HTMLDivElement>(null);
  const label = registry.get(block.type)?.label ?? block.type;
  const hidden = block.style.visibility[device] === false;

  useEffect(() => {
    const element = contentRef.current;
    if (!element) return undefined;
    return attachInlineEditing(element, {
      onChange: (path, value) => onTextChange(path, value),
    });
  }, [block, onTextChange]);

  return (
    <section
      className={cn(
        'editor-block',
        selected && 'is-selected',
        dragging && 'is-dragging',
        hidden && 'is-hidden',
      )}
      data-block-index={index}
      aria-label={t('editor.blockLabel', { name: label })}
      onClick={(event) => {
        event.stopPropagation();
        onSelect();
      }}
    >
      <div className="editor-block__tools">
        <span
          className="editor-block__handle"
          draggable
          role="button"
          tabIndex={0}
          aria-label={t('editor.dragHandle', { name: label })}
          title={t('editor.dragTitle')}
          onDragStart={(event) => {
            event.dataTransfer.effectAllowed = 'move';
            onDragStart();
          }}
          onDragEnd={onDragEnd}
        >
          ⋮⋮
        </span>
        <IconButton
          size="sm"
          aria-label={t('editor.duplicateBlock', { name: label })}
          title={t('editor.duplicate')}
          onClick={onDuplicate}
        >
          ⧉
        </IconButton>
        <IconButton
          size="sm"
          aria-label={
            hidden
              ? t('editor.showBlock', { name: label })
              : t('editor.hideBlock', { name: label })
          }
          title={hidden ? t('editor.showOnPage') : t('editor.hideOnPage')}
          aria-pressed={hidden}
          onClick={onToggleVisibility}
        >
          {hidden ? '🙈' : '👁'}
        </IconButton>
        {onSaveAsTemplate ? (
          <IconButton
            size="sm"
            aria-label={t('editor.saveBlockAsTemplate', { name: label })}
            title={t('editor.saveAsTemplate')}
            onClick={onSaveAsTemplate}
          >
            💾
          </IconButton>
        ) : null}
        <IconButton
          size="sm"
          variant="danger"
          aria-label={t('editor.deleteBlock', { name: label })}
          title={t('common.delete')}
          onClick={onRemove}
        >
          🗑
        </IconButton>
      </div>

      <div className="editor-block__content" ref={contentRef}>
        <BlockRenderer block={block} {...(forms ? { forms } : {})} />
      </div>
    </section>
  );
};

interface InsertRowProps {
  index: number;
  onOpen: (index: number) => void;
}

const InsertRow = ({ index, onOpen }: InsertRowProps) => {
  const t = useT();
  return (
    <div className="editor-insert">
      <button type="button" className="editor-insert__button" onClick={() => onOpen(index)}>
        {t('editor.insertBlock')}
      </button>
    </div>
  );
};

export const BlockCanvas = ({
  blocks,
  selectedId,
  device,
  draggingId,
  dropIndex,
  onSelect,
  onTextChange,
  onInsert,
  onDuplicate,
  onRemove,
  onToggleVisibility,
  onSaveAsTemplate,
  sections = [],
  onInsertSection,
  forms,
  onMove,
  onDragStart,
  onDropIndex,
  onDragEnd,
  onFields,
}: BlockCanvasProps) => {
  const t = useT();
  const rootRef = useRef<HTMLDivElement>(null);
  const dragFromRef = useRef<number | null>(null);
  const [slash, setSlash] = useState<{ open: boolean; index: number }>({
    open: false,
    index: 0,
  });

  const frameStyle = useMemo(() => {
    const width = deviceWidth(device);
    return width === 0 ? undefined : { width: `${width}px` };
  }, [device]);

  const measure = useCallback(
    () =>
      [...(rootRef.current?.querySelectorAll<HTMLElement>('[data-block-index]') ?? [])].map(
        (element) => element.getBoundingClientRect(),
      ),
    [],
  );

  const handleDragOver = (event: ReactDragEvent<HTMLDivElement>): void => {
    if (dragFromRef.current === null) return;
    event.preventDefault();
    event.dataTransfer.dropEffect = 'move';
    onDropIndex(resolveDropIndex(measure(), event.clientY));
  };

  const handleDrop = (event: ReactDragEvent<HTMLDivElement>): void => {
    event.preventDefault();
    const from = dragFromRef.current;
    if (from !== null && dropIndex !== null) {
      onMove([from], [dropIndex]);
    }
    dragFromRef.current = null;
    onDragEnd();
  };

  const handleDragEnd = (): void => {
    dragFromRef.current = null;
    onDragEnd();
  };

  /** Typing `/` outside a text box opens the block menu, like Notion. */
  const handleKeyDown = (event: ReactKeyboardEvent<HTMLDivElement>): void => {
    if (event.key !== '/') return;
    const target = event.target as HTMLElement;
    if (target.isContentEditable === true || target.tagName === 'INPUT') return;
    event.preventDefault();
    const selectedIndex = selectedId ? blocks.findIndex((block) => block.id === selectedId) : -1;
    setSlash({ open: true, index: selectedIndex < 0 ? blocks.length : selectedIndex + 1 });
  };

  // The AI assistant needs the selected block's own text. The rendered markup
  // already knows every editable path, so the fields are read from there and
  // reported only when the values actually change (so nothing loops).
  const lastFieldsRef = useRef('');
  useEffect(() => {
    if (!onFields) return;
    const root = rootRef.current;
    const index = selectedId ? blocks.findIndex((block) => block.id === selectedId) : -1;
    const element =
      root && index >= 0
        ? root.querySelector<HTMLElement>(`[data-block-index="${index}"] .editor-block__content`)
        : null;

    const seen = new Set<string>();
    const fields: EditorTextField[] = [];
    if (element) {
      for (const node of element.querySelectorAll<HTMLElement>('[data-editable-path]')) {
        const path = node.dataset.editablePath ?? '';
        const value = (node.textContent ?? '').trim();
        if (path.length === 0 || value.length === 0 || seen.has(path)) continue;
        seen.add(path);
        fields.push({ path, label: labelForPath(path, t), value });
      }
    }

    const key = JSON.stringify(fields);
    if (key === lastFieldsRef.current) return;
    lastFieldsRef.current = key;
    onFields(selectedId ?? '', fields);
  }, [blocks, onFields, selectedId]);

  return (
    <div
      className="editor-canvas"
      role="region"
      aria-label={t('editor.canvasLabel')}
      tabIndex={0}
      onKeyDown={handleKeyDown}
      onClick={() => onSelect(null)}
      onSubmit={(event) => event.preventDefault()}
    >
      <div
        className={cn('editor-frame', `editor-frame--${device}`)}
        style={frameStyle}
        onClick={(event) => event.stopPropagation()}
        onDragOver={handleDragOver}
        onDrop={handleDrop}
      >
        <div className="editor-blocks" ref={rootRef}>
          <InsertRow index={0} onOpen={(index) => setSlash({ open: true, index })} />

          {blocks.map((block, index) => (
            <Fragment key={block.id}>
              {dropIndex === index ? (
                <div className="editor-drop-line" data-testid="drop-line" />
              ) : null}
              <BlockRegion
                block={block}
                index={index}
                device={device}
                selected={block.id === selectedId}
                dragging={block.id === draggingId}
                onSelect={() => onSelect(block.id)}
                onTextChange={(path, value) => onTextChange(block.id, path, value)}
                onDuplicate={() => onDuplicate(block.id)}
                onRemove={() => onRemove(block.id)}
                onToggleVisibility={() => onToggleVisibility(block.id)}
                onSaveAsTemplate={
                  onSaveAsTemplate ? () => onSaveAsTemplate(block.id) : undefined
                }
                {...(forms ? { forms } : {})}
                onDragStart={() => {
                  dragFromRef.current = index;
                  onDragStart(block.id);
                }}
                onDragEnd={handleDragEnd}
              />
              <InsertRow
                index={index + 1}
                onOpen={(position) => setSlash({ open: true, index: position })}
              />
            </Fragment>
          ))}

          {dropIndex === blocks.length && blocks.length > 0 ? (
            <div className="editor-drop-line" data-testid="drop-line" />
          ) : null}

          {blocks.length === 0 ? (
            <p className="editor-blocks__empty">{t('editor.emptyCanvas')}</p>
          ) : null}
        </div>

        {slash.open ? (
          <SlashMenu
            sections={sections}
            onClose={() => setSlash({ open: false, index: 0 })}
            onPick={(type) => {
              onInsert(type, slash.index);
              setSlash({ open: false, index: 0 });
            }}
            onPickSection={(sectionId) => {
              onInsertSection?.(sectionId, slash.index);
              setSlash({ open: false, index: 0 });
            }}
          />
        ) : null}
      </div>
    </div>
  );
};
