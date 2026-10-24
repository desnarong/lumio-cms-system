import {
  Fragment,
  useCallback,
  useEffect,
  useRef,
  useState,
  type DragEvent as ReactDragEvent,
  type CSSProperties,
  type KeyboardEvent as ReactKeyboardEvent,
} from 'react';
import { createPortal } from 'react-dom';
import {
  BlockRenderer,
  applyTextRun,
  attachInlineEditing,
  deviceWidth,
  registry,
  resolveDropIndex,
  type BlockIndexPath,
  type EditorDevice,
} from '@lumio/blocks';
import type { BlockNode, BlockTree, PublicForm, SectionTemplate, TextRun } from '@lumio/shared';
import { Icon, IconButton, useT } from '@lumio/ui';
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
  onTextChange: (id: string, path: string, value: unknown) => void;
  /** Stores inline colour/size runs for one text path of a block. */
  onTextStyle: (id: string, path: string, runs: TextRun[]) => void;
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
  /** Site theme tokens, so the preview matches the published page. */
  theme?: { style: CSSProperties; attributes: Record<string, string> } | null;
}

interface BlockRegionProps {
  block: BlockNode;
  index: number;
  device: EditorDevice;
  selected: boolean;
  dragging: boolean;
  previewScale: number;
  onSelect: () => void;
  onTextChange: (path: string, value: unknown) => void;
  onTextStyle: (path: string, runs: TextRun[]) => void;
  onDuplicate: () => void;
  onRemove: () => void;
  onToggleVisibility: () => void;
  onSaveAsTemplate?: () => void;
  onDragStart: () => void;
  onDragEnd: () => void;
  forms?: readonly PublicForm[];
}

interface ForegroundDrag {
  index: number;
  node: HTMLElement;
  startX: number;
  startY: number;
  baseX: number;
  baseY: number;
  anchorX: 'left' | 'right';
  anchorY: 'top' | 'bottom';
  scale: number;
  startRect: DOMRect;
  /** The picture just before this one, used as the alignment plane. */
  previous: DOMRect | null;
}

interface ForegroundItem {
  anchorX: 'left' | 'right';
  anchorY: 'top' | 'bottom';
  x: number;
  y: number;
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
  previewScale,
  onSelect,
  onTextChange,
  onTextStyle,
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
  const [selection, setSelection] = useState<{
    path: string;
    start: number;
    end: number;
    top: number;
    left: number;
    length: number;
  } | null>(null);
  const [customColor, setCustomColor] = useState('#17469d');
  const [customSize, setCustomSize] = useState('24');
  const toolbarRef = useRef<HTMLDivElement>(null);

  const readSelection = (): void => {
    const root = contentRef.current;
    const domSelection = window.getSelection();
    if (!root || !domSelection || domSelection.rangeCount === 0) {
      setSelection(null);
      return;
    }
    const range = domSelection.getRangeAt(0);
    if (range.collapsed) {
      setSelection(null);
      return;
    }
    const anchor = range.commonAncestorContainer;
    const element = (
      anchor.nodeType === Node.ELEMENT_NODE ? (anchor as Element) : anchor.parentElement
    )?.closest<HTMLElement>('[data-editable-path]');
    if (!element || !root.contains(element)) {
      setSelection(null);
      return;
    }
    const before = range.cloneRange();
    before.selectNodeContents(element);
    before.setEnd(range.startContainer, range.startOffset);
    const start = before.toString().length;
    const length = range.toString().length;
    if (length === 0) {
      setSelection(null);
      return;
    }
    const rect = range.getBoundingClientRect();
    const path = element.dataset.editablePath;
    if (!path) {
      setSelection(null);
      return;
    }
    setSelection({
      path,
      start,
      end: start + length,
      top: rect.top,
      left: rect.left,
      length: element.textContent?.length ?? 0,
    });
  };

  const applyRun = (
    patch: Partial<Pick<TextRun, 'color' | 'size' | 'colorHex' | 'sizePx'>>,
    keepSelection = false,
  ): void => {
    if (!selection) return;
    const current = block.textStyles?.[selection.path] ?? [];
    const runs = applyTextRun(current, selection.start, selection.end, patch, selection.length);
    onTextStyle(selection.path, runs);
    if (!keepSelection) setSelection(null);
  };

  useEffect(() => {
    const element = contentRef.current;
    if (!element) return undefined;
    return attachInlineEditing(element, {
      onChange: (path, value) => onTextChange(path, value),
    });
  }, [block, onTextChange]);

  useEffect(() => {
    if (!selection) return undefined;
    const onPointerDown = (event: PointerEvent): void => {
      const target = event.target as Node;
      if (toolbarRef.current?.contains(target)) return;
      if (contentRef.current?.contains(target)) return;
      setSelection(null);
    };
    document.addEventListener('pointerdown', onPointerDown);
    return () => document.removeEventListener('pointerdown', onPointerDown);
  }, [selection]);

  // Foreground cut-outs (hero logo, product pictures) are painted above the
  // banner, so the editor lets the owner pick and drag them instead of only
  // being able to click the block or its text.
  const blockRef = useRef(block);
  blockRef.current = block;
  const onTextChangeRef = useRef(onTextChange);
  onTextChangeRef.current = onTextChange;
  const onSelectRef = useRef(onSelect);
  onSelectRef.current = onSelect;
  const previewScaleRef = useRef(previewScale);
  previewScaleRef.current = previewScale;
  const foregroundDragRef = useRef<ForegroundDrag | null>(null);

  useEffect(() => {
    const root = contentRef.current;
    if (!root) return undefined;

    const nodes = [...root.querySelectorAll<HTMLElement>('[data-hero-foreground]')];
    const cleanups = nodes.map((node) => {
      const index = Number(node.dataset.heroForeground);

      const onPointerDown = (event: PointerEvent): void => {
        if (event.button !== 0) return;
        const item = (blockRef.current.props.foregrounds as ForegroundItem[] | undefined)?.[index];
        if (!item) return;
        event.preventDefault();
        event.stopPropagation();
        node.setPointerCapture(event.pointerId);
        foregroundDragRef.current = {
          index,
          node,
          startX: event.clientX,
          startY: event.clientY,
          baseX: item.x,
          baseY: item.y,
          anchorX: item.anchorX,
          anchorY: item.anchorY,
          scale: previewScaleRef.current || 1,
          startRect: node.getBoundingClientRect(),
          previous:
            index > 0 ? (nodes[index - 1]?.getBoundingClientRect() ?? null) : null,
        };
        onSelectRef.current();
        root
          .querySelectorAll('.is-editor-selected-foreground')
          .forEach((element) => element.classList.remove('is-editor-selected-foreground'));
        node.classList.add('is-editor-selected-foreground');
      };

      const onPointerMove = (event: PointerEvent): void => {
        const drag = foregroundDragRef.current;
        if (!drag || drag.index !== index) return;
        event.preventDefault();

        let dx = event.clientX - drag.startX;
        let dy = event.clientY - drag.startY;

        // Snap the dragged picture onto the same top/centre/bottom or
        // left/centre/right line as the other pictures, so a row of badges or
        // two product shots land on one plane instead of a few pixels apart.
        const threshold = 8;
        const width = drag.startRect.width;
        const height = drag.startRect.height;
        const left = drag.startRect.left + dx;
        const top = drag.startRect.top + dy;
        const right = left + width;
        const bottom = top + height;
        const centerX = left + width / 2;
        const centerY = top + height / 2;

        const nearest = (
          pairs: Array<[number, number]>,
        ): { delta: number; distance: number } | null => {
          let best: { delta: number; distance: number } | null = null;
          for (const [value, target] of pairs) {
            const distance = Math.abs(target - value);
            if (distance > threshold) continue;
            if (!best || distance < best.distance) best = { delta: target - value, distance };
          }
          return best;
        };

        let snapX: { delta: number; distance: number } | null = null;
        let snapY: { delta: number; distance: number } | null = null;
        const other = drag.previous;
        if (other) {
          snapX = nearest([
            [left, other.left],
            [right, other.right],
            [centerX, other.left + other.width / 2],
          ]);
          snapY = nearest([
            [top, other.top],
            [bottom, other.bottom],
            [centerY, other.top + other.height / 2],
          ]);
        }
        if (snapX) dx += snapX.delta;
        if (snapY) dy += snapY.delta;

        const pageX = dx / drag.scale;
        const pageY = dy / drag.scale;
        const x = Math.round(drag.baseX + (drag.anchorX === 'left' ? pageX : -pageX));
        const y = Math.round(drag.baseY + (drag.anchorY === 'top' ? pageY : -pageY));
        onTextChangeRef.current(`props.foregrounds.${index}.x`, x);
        onTextChangeRef.current(`props.foregrounds.${index}.y`, y);
      };

      const onPointerUp = (event: PointerEvent): void => {
        if (foregroundDragRef.current?.index !== index) return;
        foregroundDragRef.current = null;
        try {
          node.releasePointerCapture(event.pointerId);
        } catch {
          // The pointer may already be gone; releasing twice is harmless.
        }
      };

      const stopClick = (event: Event): void => {
        event.stopPropagation();
        event.preventDefault();
      };

      node.addEventListener('pointerdown', onPointerDown);
      node.addEventListener('pointermove', onPointerMove);
      node.addEventListener('pointerup', onPointerUp);
      node.addEventListener('pointercancel', onPointerUp);
      node.addEventListener('click', stopClick);

      return () => {
        node.removeEventListener('pointerdown', onPointerDown);
        node.removeEventListener('pointermove', onPointerMove);
        node.removeEventListener('pointerup', onPointerUp);
        node.removeEventListener('pointercancel', onPointerUp);
        node.removeEventListener('click', stopClick);
        node.classList.remove('is-editor-selected-foreground');
      };
    });

    return () => cleanups.forEach((cleanup) => cleanup());
  }, [block.id]);

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
      onMouseUp={readSelection}
      onKeyUp={readSelection}
    >
      {selection && typeof document !== 'undefined'
        ? createPortal(
            <div
              ref={toolbarRef}
              className="editor-text-toolbar"
              style={{ top: Math.max(8, selection.top - 48), left: selection.left }}
              onMouseDown={(event) => {
                if ((event.target as HTMLElement).tagName !== 'INPUT') event.preventDefault();
              }}
              onMouseUp={(event) => event.stopPropagation()}
              onKeyUp={(event) => event.stopPropagation()}
              onClick={(event) => event.stopPropagation()}
            >
          <span className="editor-text-toolbar__label">สี</span>
          {(['inherit', 'primary', 'accent', 'muted'] as const).map((color) => (
            <button
              key={color}
              type="button"
              className={`editor-text-toolbar__swatch is-${color}`}
              aria-label={`สี ${color}`}
              title={`สี ${color}`}
              onClick={() => applyRun({ color })}
            />
          ))}
          <label className="editor-text-toolbar__custom" title="เลือกสีเอง">
            <input
              type="color"
              aria-label="เลือกสีเอง"
              value={customColor}
              onChange={(event) => {
                setCustomColor(event.target.value);
                applyRun({ colorHex: event.target.value }, true);
              }}
            />
          </label>
          <span className="editor-text-toolbar__label">ขนาด</span>
          {(['sm', 'base', 'lg', 'xl'] as const).map((size) => (
            <button
              key={size}
              type="button"
              className="editor-text-toolbar__size"
              onClick={() => applyRun({ size })}
            >
              {size.toUpperCase()}
            </button>
          ))}
          <input
            className="editor-text-toolbar__number"
            type="number"
            min={8}
            max={240}
            aria-label="ขนาดตัวอักษร (px)"
            title="ขนาดตัวอักษร (px)"
            value={customSize}
            onChange={(event) => setCustomSize(event.target.value)}
            onKeyDown={(event) => {
              if (event.key !== 'Enter') return;
              event.preventDefault();
              const px = Math.min(240, Math.max(8, Math.round(Number(customSize) || 24)));
              applyRun({ sizePx: px }, true);
            }}
          />
          <button
            type="button"
            className="editor-text-toolbar__size"
            onClick={() => {
              const px = Math.min(240, Math.max(8, Math.round(Number(customSize) || 24)));
              applyRun({ sizePx: px }, true);
            }}
          >
            ใช้
          </button>
            </div>,
            document.body,
          )
        : null}
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
          <Icon name="grip" size={14} />
        </span>
        <IconButton
          size="sm"
          aria-label={t('editor.duplicateBlock', { name: label })}
          title={t('editor.duplicate')}
          onClick={onDuplicate}
        >
          <Icon name="copy" size={16} />
        </IconButton>
        <IconButton
          size="sm"
          aria-label={
            hidden ? t('editor.showBlock', { name: label }) : t('editor.hideBlock', { name: label })
          }
          title={hidden ? t('editor.showOnPage') : t('editor.hideOnPage')}
          aria-pressed={hidden}
          onClick={onToggleVisibility}
        >
          {hidden ? <Icon name="eye-off" size={16} /> : <Icon name="eye" size={16} />}
        </IconButton>
        {onSaveAsTemplate ? (
          <IconButton
            size="sm"
            aria-label={t('editor.saveBlockAsTemplate', { name: label })}
            title={t('editor.saveAsTemplate')}
            onClick={onSaveAsTemplate}
          >
            <Icon name="save" size={16} />
          </IconButton>
        ) : null}
        <IconButton
          size="sm"
          variant="danger"
          aria-label={t('editor.deleteBlock', { name: label })}
          title={t('common.delete')}
          onClick={onRemove}
        >
          <Icon name="trash" size={16} />
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
  onOpen: (index: number, anchor: HTMLElement) => void;
}

const InsertRow = ({ index, onOpen }: InsertRowProps) => {
  const t = useT();
  return (
    <div className="editor-insert">
      <button
        type="button"
        className="editor-insert__button"
        onClick={(event) => onOpen(index, event.currentTarget)}
      >
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
  onTextStyle,
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
  theme,
}: BlockCanvasProps) => {
  const t = useT();
  const canvasRef = useRef<HTMLDivElement>(null);
  const previewRef = useRef<HTMLDivElement>(null);
  const rootRef = useRef<HTMLDivElement>(null);
  const dragFromRef = useRef<number | null>(null);
  const previewWidth = deviceWidth(device);
  const [preview, setPreview] = useState({ scale: 1, height: 0 });
  const [slash, setSlash] = useState<{
    open: boolean;
    index: number;
    top: number;
    left: number;
    opener: HTMLElement | null;
  }>({ open: false, index: 0, top: 0, left: 0, opener: null });

  const closeSlash = useCallback((): void => {
    setSlash((current) => ({ ...current, open: false }));
    slash.opener?.focus();
  }, [slash.opener]);

  /** Places the panel next to the row that opened it, clamped to the viewport. */
  const openSlashAt = useCallback(
    (
      index: number,
      rect: { left: number; bottom: number },
      opener: HTMLElement | null = null,
    ): void => {
      const width = Math.min(360, window.innerWidth - 24);
      const left = Math.max(12, Math.min(rect.left, window.innerWidth - width - 12));
      const top = Math.max(12, Math.min(rect.bottom + 8, window.innerHeight - 420));
      setSlash({ open: true, index, top, left, opener });
    },
    [],
  );

  const openSlash = useCallback(
    (index: number, anchor: HTMLElement): void => {
      openSlashAt(index, anchor.getBoundingClientRect(), anchor);
    },
    [openSlashAt],
  );

  const frameStyle = {
    width: Math.round(previewWidth * preview.scale),
    ...(preview.height > 0 ? { height: Math.round(preview.height) } : {}),
  };

  useEffect(() => {
    const canvas = canvasRef.current;
    const inner = previewRef.current;
    if (!canvas || !inner) return undefined;

    const update = (): void => {
      const available = Math.max(240, canvas.clientWidth - 2);
      const scale = Math.min(1, available / previewWidth);
      const height = inner.scrollHeight * scale;
      setPreview((current) =>
        Math.abs(current.scale - scale) < 0.001 && Math.abs(current.height - height) < 1
          ? current
          : { scale, height },
      );
    };

    update();
    const observer = new ResizeObserver(update);
    observer.observe(canvas);
    observer.observe(inner);
    return () => observer.disconnect();
  }, [previewWidth, blocks]);

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
    const index = selectedIndex < 0 ? blocks.length : selectedIndex + 1;
    const root = rootRef.current?.getBoundingClientRect();
    openSlashAt(index, {
      left: (root?.left ?? 24) + 16,
      bottom: (root?.top ?? 80) + 72,
    });
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
      ref={canvasRef}
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
        <div
          ref={previewRef}
          className="editor-frame__viewport"
          style={{
            width: `${previewWidth}px`,
            transform: `scale(${preview.scale})`,
          }}
        >
          <div
            className="site editor-preview"
            style={theme?.style}
            {...(theme?.attributes ?? {})}
          >
            <div className="editor-blocks" ref={rootRef}>
              <InsertRow index={0} onOpen={openSlash} />

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
                  previewScale={preview.scale}
                  onSelect={() => onSelect(block.id)}
                  onTextChange={(path, value) => onTextChange(block.id, path, value)}
                  onTextStyle={(path, runs) => onTextStyle(block.id, path, runs)}
                  onDuplicate={() => onDuplicate(block.id)}
                  onRemove={() => onRemove(block.id)}
                  onToggleVisibility={() => onToggleVisibility(block.id)}
                  onSaveAsTemplate={onSaveAsTemplate ? () => onSaveAsTemplate(block.id) : undefined}
                  {...(forms ? { forms } : {})}
                  onDragStart={() => {
                    dragFromRef.current = index;
                    onDragStart(block.id);
                  }}
                  onDragEnd={handleDragEnd}
                />
                <InsertRow
                  index={index + 1}
                  onOpen={openSlash}
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
          </div>
        </div>
      </div>

      {slash.open ? (
        <SlashMenu
          top={slash.top}
          left={slash.left}
          sections={sections}
          onClose={closeSlash}
          onPick={(type) => {
            onInsert(type, slash.index);
            setSlash({ open: false, index: 0, top: 0, left: 0, opener: null });
          }}
          onPickSection={(sectionId) => {
            onInsertSection?.(sectionId, slash.index);
            setSlash({ open: false, index: 0, top: 0, left: 0, opener: null });
          }}
        />
      ) : null}
    </div>
  );
};
