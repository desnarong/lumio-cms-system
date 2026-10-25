import {
  Fragment,
  useCallback,
  useEffect,
  useRef,
  useState,
  type DragEvent as ReactDragEvent,
  type CSSProperties,
  type KeyboardEvent as ReactKeyboardEvent,
  type PointerEvent as ReactPointerEvent,
} from 'react';
import { createPortal } from 'react-dom';
import {
  BlockRenderer,
  applyTextRun,
  attachInlineEditing,
  deviceWidth,
  floatXPercent,
  floatYPercent,
  registry,
  resolveDropIndex,
  type BlockIndexPath,
  type EditorDevice,
  type ShopProductCard,
} from '@lumio/blocks';
import type { BlockNode, BlockTree, PublicForm, SectionTemplate, TextRun } from '@lumio/shared';
import { Icon, IconButton, useT } from '@lumio/ui';
import { cn } from '@lumio/ui/cn';
import { labelForPath } from './fields.js';
import { coverOverflow, panFocalPoint } from './crop.js';
import { panPosition } from './pan.js';
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
  /** Moves the block's text by a pixel offset, as one undo step. */
  onTextOffset?: (id: string, offsetX: number, offsetY: number) => void;
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
  /** Live shop products, so a products block previews the real catalog. */
  shopProducts?: readonly ShopProductCard[];
  onMove: (from: BlockIndexPath, to: BlockIndexPath) => void;
  onDragStart: (id: string) => void;
  onDropIndex: (index: number | null) => void;
  onDragEnd: () => void;
  /** Persists a drag-to-resize result on one block, as a single undo step. */
  onResize?: (
    id: string,
    size: { widthPx?: number; heightPx?: number; marginTopPx?: number },
  ) => void;
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
  onTextOffset?: (offsetX: number, offsetY: number) => void;
  onDuplicate: () => void;
  onRemove: () => void;
  onToggleVisibility: () => void;
  onSaveAsTemplate?: () => void;
  onDragStart: () => void;
  onDragEnd: () => void;
  onResize?: (size: { widthPx?: number; heightPx?: number; marginTopPx?: number }) => void;
  forms?: readonly PublicForm[];
  shopProducts?: readonly ShopProductCard[];
}

interface ForegroundDrag {
  index: number;
  node: HTMLElement;
  startX: number;
  startY: number;
  /** Position as a share of the banner, so a resize keeps the same layout. */
  baseX: number;
  baseY: number;
  anchorX: 'left' | 'right';
  anchorY: 'top' | 'bottom';
  scale: number;
  heroWidth: number;
  heroHeight: number;
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
  onTextOffset,
  onDuplicate,
  onRemove,
  onToggleVisibility,
  onSaveAsTemplate,
  onDragStart,
  onDragEnd,
  onResize,
  forms,
  shopProducts,
}: BlockRegionProps) => {
  const t = useT();
  const contentRef = useRef<HTMLDivElement>(null);
  const sectionRef = useRef<HTMLElement>(null);
  const [resizing, setResizing] = useState<{ axis: 'x' | 'y'; value: number } | null>(null);
  const [verticalDrag, setVerticalDrag] = useState<{
    height?: number;
    marginTop?: number;
  } | null>(null);
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
  const textDragRef = useRef<{
    startX: number;
    startY: number;
    baseX: number;
    baseY: number;
    x: number;
    y: number;
    scale: number;
  } | null>(null);

  const innerElement = (): HTMLElement | null =>
    contentRef.current?.querySelector<HTMLElement>('.lumio-block__inner') ?? null;

  /** Drags the text of this block, previewing the move before committing it once. */
  const startTextDrag = (event: ReactPointerEvent<HTMLButtonElement>): void => {
    if (!onTextOffset || event.button !== 0) return;
    event.preventDefault();
    event.stopPropagation();
    onSelect();
    event.currentTarget.setPointerCapture(event.pointerId);
    textDragRef.current = {
      startX: event.clientX,
      startY: event.clientY,
      baseX: block.style.offsetX ?? 0,
      baseY: block.style.offsetY ?? 0,
      x: block.style.offsetX ?? 0,
      y: block.style.offsetY ?? 0,
      scale: previewScale || 1,
    };
  };

  const moveText = (event: ReactPointerEvent<HTMLButtonElement>): void => {
    const drag = textDragRef.current;
    if (!drag) return;
    event.preventDefault();
    drag.x = Math.min(600, Math.max(-600, Math.round(drag.baseX + (event.clientX - drag.startX) / drag.scale)));
    drag.y = Math.min(600, Math.max(-600, Math.round(drag.baseY + (event.clientY - drag.startY) / drag.scale)));
    const inner = innerElement();
    if (inner) inner.style.transform = `translate(${drag.x}px, ${drag.y}px)`;
  };

  const endTextDrag = (event: ReactPointerEvent<HTMLButtonElement>): void => {
    const drag = textDragRef.current;
    if (!drag) return;
    textDragRef.current = null;
    const inner = innerElement();
    if (inner) inner.style.transform = '';
    try {
      event.currentTarget.releasePointerCapture(event.pointerId);
    } catch {
      // The pointer may already be released; nothing to clean up.
    }
    if (drag.x !== drag.baseX || drag.y !== drag.baseY) {
      onTextOffset?.(drag.x, drag.y);
    }
  };

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
        const heroRect = node.closest('.lumio-hero')?.getBoundingClientRect();
        const scale = previewScaleRef.current || 1;
        foregroundDragRef.current = {
          index,
          node,
          startX: event.clientX,
          startY: event.clientY,
          baseX: floatXPercent(item),
          baseY: floatYPercent(item),
          anchorX: item.anchorX,
          anchorY: item.anchorY,
          scale,
          heroWidth: (heroRect?.width ?? 0) / scale,
          heroHeight: (heroRect?.height ?? 0) / scale,
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
        // Store the result as a share of the banner, so a later resize keeps the
        // composition instead of leaving the cut-outs stranded in old pixels.
        const widthRatio = drag.heroWidth > 0 ? 100 / drag.heroWidth : 0;
        const heightRatio = drag.heroHeight > 0 ? 100 / drag.heroHeight : 0;
        const x =
          drag.baseX + (drag.anchorX === 'left' ? pageX : -pageX) * widthRatio;
        const y =
          drag.baseY + (drag.anchorY === 'top' ? pageY : -pageY) * heightRatio;
        onTextChangeRef.current(
          `props.foregrounds.${index}.xPercent`,
          Math.round(Math.min(250, Math.max(-150, x)) * 100) / 100,
        );
        onTextChangeRef.current(
          `props.foregrounds.${index}.yPercent`,
          Math.round(Math.min(250, Math.max(-150, y)) * 100) / 100,
        );
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
  }, [block.id, block.props.layout]);

  // Panning the hero photo: the editor writes the background position the
  // panel shows, so the crop can be moved by dragging the picture itself.
  const backgroundDragRef = useRef<{
    startX: number;
    startY: number;
    baseX: number;
    baseY: number;
    scale: number;
    overflowX: number;
    overflowY: number;
  } | null>(null);

  useEffect(() => {
    const root = contentRef.current;
    const hero = root?.querySelector<HTMLElement>('.lumio-hero--overlay');
    const image = hero?.querySelector<HTMLImageElement>('.lumio-hero__background img');
    if (!hero || !image) return undefined;

    const onPointerDown = (event: PointerEvent): void => {
      if (event.button !== 0) return;
      const target = event.target as HTMLElement;
      if (
        target.closest(
          'a, button, input, select, textarea, [data-editable-path], [data-hero-foreground]',
        )
      ) {
        return;
      }
      const props = blockRef.current.props as {
        backgroundX?: number;
        backgroundY?: number;
        backgroundZoom?: number;
      };
      const scale = previewScaleRef.current || 1;
      const box = hero.getBoundingClientRect();
      const width = box.width / scale;
      const height = box.height / scale;
      const zoom = (props.backgroundZoom ?? 100) / 100;
      const naturalWidth = image.naturalWidth || 1;
      const naturalHeight = image.naturalHeight || 1;
      const { overflowX, overflowY } = coverOverflow({
        boxWidth: width,
        boxHeight: height,
        naturalWidth,
        naturalHeight,
        zoom,
      });
      // Nothing to pan when the picture already fits the frame exactly.
      if (overflowX < 1 && overflowY < 1) return;

      event.preventDefault();
      event.stopPropagation();
      try {
        hero.setPointerCapture(event.pointerId);
      } catch {
        // Dragging still works without capture in older browsers.
      }
      backgroundDragRef.current = {
        startX: event.clientX,
        startY: event.clientY,
        baseX: props.backgroundX ?? 50,
        baseY: props.backgroundY ?? 50,
        scale,
        overflowX,
        overflowY,
      };
      hero.classList.add('is-panning-background');
      onSelectRef.current();
    };

    const onPointerMove = (event: PointerEvent): void => {
      const drag = backgroundDragRef.current;
      if (!drag) return;
      event.preventDefault();
      const next = panPosition(drag, event.clientX, event.clientY);
      if (drag.overflowX > 0) onTextChangeRef.current('props.backgroundX', next.x);
      if (drag.overflowY > 0) onTextChangeRef.current('props.backgroundY', next.y);
    };

    const onPointerUp = (event: PointerEvent): void => {
      if (!backgroundDragRef.current) return;
      backgroundDragRef.current = null;
      hero.classList.remove('is-panning-background');
      try {
        hero.releasePointerCapture(event.pointerId);
      } catch {
        // The pointer may already be gone; releasing twice is harmless.
      }
    };

    hero.addEventListener('pointerdown', onPointerDown);
    hero.addEventListener('pointermove', onPointerMove);
    hero.addEventListener('pointerup', onPointerUp);
    hero.addEventListener('pointercancel', onPointerUp);
    return () => {
      hero.removeEventListener('pointerdown', onPointerDown);
      hero.removeEventListener('pointermove', onPointerMove);
      hero.removeEventListener('pointerup', onPointerUp);
      hero.removeEventListener('pointercancel', onPointerUp);
      hero.classList.remove('is-panning-background');
    };
  }, [block.id, block.props.layout]);

  // Cropped image blocks: drag the photo to choose which part stays in frame.
  // The result is stored as the media focal point the block already renders.
  useEffect(() => {
    if (block.type !== 'image') return undefined;
    const image = contentRef.current?.querySelector<HTMLImageElement>(
      '.lumio-image .lumio-img__element',
    );
    if (!image) return undefined;

    let drag: {
      startX: number;
      startY: number;
      base: { x: number; y: number };
      scale: number;
      overflowX: number;
      overflowY: number;
    } | null = null;

    const onPointerDown = (event: PointerEvent): void => {
      if (event.button !== 0) return;
      const props = blockRef.current.props as {
        image?: { focalPoint?: { x: number; y: number } } | null;
        zoom?: number;
      };
      const scale = previewScaleRef.current || 1;
      // Measure the clipping frame, not the zoomed picture, so the zoom
      // transform is not counted twice.
      const box = (image.closest('.lumio-img') ?? image).getBoundingClientRect();
      const { overflowX, overflowY } = coverOverflow({
        boxWidth: box.width / scale,
        boxHeight: box.height / scale,
        naturalWidth: image.naturalWidth,
        naturalHeight: image.naturalHeight,
        zoom: (props.zoom ?? 100) / 100,
      });
      if (overflowX < 1 && overflowY < 1) return;
      event.preventDefault();
      event.stopPropagation();
      try {
        image.setPointerCapture(event.pointerId);
      } catch {
        // Dragging still works without capture in older browsers.
      }
      drag = {
        startX: event.clientX,
        startY: event.clientY,
        base: props.image?.focalPoint ?? { x: 0.5, y: 0.5 },
        scale,
        overflowX,
        overflowY,
      };
      image.classList.add('is-panning-image');
      onSelectRef.current();
    };

    const onPointerMove = (event: PointerEvent): void => {
      if (!drag) return;
      event.preventDefault();
      const props = blockRef.current.props as { image?: Record<string, unknown> | null };
      if (!props.image) return;
      onTextChangeRef.current('props.image', {
        ...props.image,
        focalPoint: panFocalPoint(drag, event.clientX, event.clientY),
      });
    };

    const onPointerUp = (event: PointerEvent): void => {
      if (!drag) return;
      drag = null;
      image.classList.remove('is-panning-image');
      try {
        image.releasePointerCapture(event.pointerId);
      } catch {
        // The pointer may already be gone; releasing twice is harmless.
      }
    };

    image.addEventListener('pointerdown', onPointerDown);
    image.addEventListener('pointermove', onPointerMove);
    image.addEventListener('pointerup', onPointerUp);
    image.addEventListener('pointercancel', onPointerUp);
    return () => {
      image.removeEventListener('pointerdown', onPointerDown);
      image.removeEventListener('pointermove', onPointerMove);
      image.removeEventListener('pointerup', onPointerUp);
      image.removeEventListener('pointercancel', onPointerUp);
      image.classList.remove('is-panning-image');
    };
  }, [block.id, block.type]);

  /** Current size in page pixels, falling back to what the block renders today. */
  const sizeOf = (axis: 'x' | 'y'): number => {
    const scale = previewScale || 1;
    if (axis === 'x') {
      return (
        block.style.widthPx ??
        Math.round((contentRef.current?.getBoundingClientRect().width ?? 0) / scale)
      );
    }
    return (
      block.style.heightPx ??
      Math.round((sectionRef.current?.getBoundingClientRect().height ?? 0) / scale)
    );
  };

  const clampSize = (axis: 'x' | 'y', value: number): number =>
    axis === 'x'
      ? Math.min(2400, Math.max(160, Math.round(value)))
      : Math.min(2400, Math.max(80, Math.round(value)));

  const beginResize =
    (axis: 'x' | 'y') =>
    (event: ReactPointerEvent<HTMLButtonElement>): void => {
      if (!onResize) return;
      event.preventDefault();
      event.stopPropagation();
      const scale = previewScale || 1;
      const startX = event.clientX;
      const startY = event.clientY;
      const base = sizeOf(axis);
      let value = base;
      setResizing({ axis, value });

      const handle = event.currentTarget;
      handle.setPointerCapture(event.pointerId);

      const move = (moveEvent: PointerEvent): void => {
        const delta =
          axis === 'x' ? (moveEvent.clientX - startX) / scale : (moveEvent.clientY - startY) / scale;
        value = clampSize(axis, base + delta);
        setResizing({ axis, value });
      };
      const finish = (): void => {
        handle.removeEventListener('pointermove', move);
        handle.removeEventListener('pointerup', finish);
        handle.removeEventListener('pointercancel', finish);
        setResizing(null);
        onResize(axis === 'x' ? { widthPx: value } : { heightPx: value });
      };
      handle.addEventListener('pointermove', move);
      handle.addEventListener('pointerup', finish);
      handle.addEventListener('pointercancel', finish);
    };

  const clampMargin = (value: number): number => Math.min(1200, Math.max(-1200, Math.round(value)));

  /** Drags the top edge: the block grows upward while its bottom stays put. */
  const beginTopResize = (event: ReactPointerEvent<HTMLButtonElement>): void => {
    if (!onResize) return;
    event.preventDefault();
    event.stopPropagation();
    const scale = previewScale || 1;
    const startY = event.clientY;
    const baseHeight = sizeOf('y');
    const baseMargin = block.style.marginTopPx ?? 0;
    let height = baseHeight;
    let marginTop = baseMargin;
    setVerticalDrag({ height, marginTop });
    const handle = event.currentTarget;
    handle.setPointerCapture(event.pointerId);
    const move = (moveEvent: PointerEvent): void => {
      const delta = (moveEvent.clientY - startY) / scale;
      height = clampSize('y', baseHeight - delta);
      marginTop = clampMargin(baseMargin - (height - baseHeight));
      setVerticalDrag({ height, marginTop });
    };
    const finish = (): void => {
      handle.removeEventListener('pointermove', move);
      handle.removeEventListener('pointerup', finish);
      handle.removeEventListener('pointercancel', finish);
      setVerticalDrag(null);
      onResize({ heightPx: height, marginTopPx: marginTop });
    };
    handle.addEventListener('pointermove', move);
    handle.addEventListener('pointerup', finish);
    handle.addEventListener('pointercancel', finish);
  };

  /** Drags the whole block up or down without changing its height. */
  const beginMoveBox = (event: ReactPointerEvent<HTMLButtonElement>): void => {
    if (!onResize) return;
    event.preventDefault();
    event.stopPropagation();
    const scale = previewScale || 1;
    const startY = event.clientY;
    const baseMargin = block.style.marginTopPx ?? 0;
    let marginTop = baseMargin;
    setVerticalDrag({ marginTop });
    const handle = event.currentTarget;
    handle.setPointerCapture(event.pointerId);
    const move = (moveEvent: PointerEvent): void => {
      marginTop = clampMargin(baseMargin + (moveEvent.clientY - startY) / scale);
      setVerticalDrag({ marginTop });
    };
    const finish = (): void => {
      handle.removeEventListener('pointermove', move);
      handle.removeEventListener('pointerup', finish);
      handle.removeEventListener('pointercancel', finish);
      setVerticalDrag(null);
      onResize({ marginTopPx: marginTop });
    };
    handle.addEventListener('pointermove', move);
    handle.addEventListener('pointerup', finish);
    handle.addEventListener('pointercancel', finish);
  };

  /** Keyboard equivalent for the top edge and the vertical move handle. */
  const nudgeTop = (step: number): void => {
    if (!onResize) return;
    const baseHeight = sizeOf('y');
    const baseMargin = block.style.marginTopPx ?? 0;
    const height = clampSize('y', baseHeight + step);
    onResize({
      heightPx: height,
      marginTopPx: clampMargin(baseMargin - (height - baseHeight)),
    });
  };

  const nudgeBox = (step: number): void => {
    if (!onResize) return;
    onResize({ marginTopPx: clampMargin((block.style.marginTopPx ?? 0) + step) });
  };

  /** Keyboard equivalent of the drag, so resizing never needs a mouse. */
  const nudgeSize = (axis: 'x' | 'y', step: number): void => {
    if (!onResize) return;
    const next = clampSize(axis, sizeOf(axis) + step);
    onResize(axis === 'x' ? { widthPx: next } : { heightPx: next });
  };

  // The block renders with the size being dragged, so the preview matches the
  // value that is committed when the pointer is released.
  // The editor moves the wrapper instead of the inner block, so the resize
  // handles stay on the block's visible edges while dragging.
  const editorMargin = verticalDrag?.marginTop ?? block.style.marginTopPx ?? 0;
  const previewBlock = {
    ...block,
    style: {
      ...block.style,
      ...(resizing
        ? resizing.axis === 'x'
          ? { widthPx: resizing.value }
          : { heightPx: resizing.value }
        : {}),
      ...(verticalDrag?.height === undefined ? {} : { heightPx: verticalDrag.height }),
      marginTopPx: 0,
    },
  };

  return (
    <section
      ref={sectionRef}
      style={editorMargin === 0 ? undefined : { marginTop: `${editorMargin}px` }}
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
        {onTextOffset ? (
          <button
            type="button"
            className="editor-block__handle editor-block__move"
            aria-label={t('editor.moveText', { name: label })}
            title={t('editor.moveTextTitle')}
            onPointerDown={startTextDrag}
            onPointerMove={moveText}
            onPointerUp={endTextDrag}
            onPointerCancel={endTextDrag}
          >
            <Icon name="move" size={14} />
          </button>
        ) : null}
        {onResize ? (
          <button
            type="button"
            className="editor-block__handle editor-block__move"
            aria-label={t('editor.moveBox', { name: label })}
            title={t('editor.moveBoxTitle')}
            onPointerDown={beginMoveBox}
            onKeyDown={(event) => {
              if (event.key !== 'ArrowUp' && event.key !== 'ArrowDown') return;
              event.preventDefault();
              nudgeBox(event.key === 'ArrowDown' ? 16 : -16);
            }}
          >
            <span className="editor-block__move-glyph" aria-hidden="true">
              ↕
            </span>
          </button>
        ) : null}
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
        <BlockRenderer
          block={previewBlock}
          {...(forms ? { forms } : {})}
          {...(shopProducts ? { shopProducts } : {})}
        />
      </div>

      {selected && onResize ? (
        <>
          <button
            type="button"
            className="editor-block__resize editor-block__resize--right"
            aria-label={t('editor.resizeWidth')}
            title={t('editor.resizeWidth')}
            onPointerDown={beginResize('x')}
            onKeyDown={(event) => {
              if (event.key !== 'ArrowLeft' && event.key !== 'ArrowRight') return;
              event.preventDefault();
              nudgeSize('x', event.key === 'ArrowRight' ? 16 : -16);
            }}
          />
          <button
            type="button"
            className="editor-block__resize editor-block__resize--top"
            aria-label={t('editor.resizeTop')}
            title={t('editor.resizeTop')}
            onPointerDown={beginTopResize}
            onKeyDown={(event) => {
              if (event.key !== 'ArrowUp' && event.key !== 'ArrowDown') return;
              event.preventDefault();
              nudgeTop(event.key === 'ArrowUp' ? 16 : -16);
            }}
          />
          <button
            type="button"
            className="editor-block__resize editor-block__resize--bottom"
            aria-label={t('editor.resizeHeight')}
            title={t('editor.resizeHeight')}
            onPointerDown={beginResize('y')}
            onKeyDown={(event) => {
              if (event.key !== 'ArrowUp' && event.key !== 'ArrowDown') return;
              event.preventDefault();
              nudgeSize('y', event.key === 'ArrowDown' ? 16 : -16);
            }}
          />
          {resizing || verticalDrag ? (
            <span className="editor-block__size" role="status">
              {resizing ? resizing.value : verticalDrag?.height ?? editorMargin} px
            </span>
          ) : null}
        </>
      ) : null}
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
  onTextOffset,
  onInsert,
  onDuplicate,
  onRemove,
  onToggleVisibility,
  onSaveAsTemplate,
  sections = [],
  onInsertSection,
  forms,
  shopProducts,
  onMove,
  onDragStart,
  onDropIndex,
  onDragEnd,
  onResize,
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
                  {...(onTextOffset
                    ? { onTextOffset: (x, y) => onTextOffset(block.id, x, y) }
                    : {})}
                  onDuplicate={() => onDuplicate(block.id)}
                  onRemove={() => onRemove(block.id)}
                  onToggleVisibility={() => onToggleVisibility(block.id)}
                  onSaveAsTemplate={onSaveAsTemplate ? () => onSaveAsTemplate(block.id) : undefined}
                  {...(onResize ? { onResize: (size) => onResize(block.id, size) } : {})}
                  {...(forms ? { forms } : {})}
                  {...(shopProducts ? { shopProducts } : {})}
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
