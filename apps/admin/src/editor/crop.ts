import { panPosition, type PanFrame } from './pan.js';

/** Fraction of the picture hidden past each edge, so pan works on any crop. */
export interface CropOverflow {
  overflowX: number;
  overflowY: number;
}

/**
 * Overflow of an `object-fit: cover` picture, in page pixels. A picture that is
 * not cropped has none, and the editor then leaves the drag alone.
 */
export const coverOverflow = (input: {
  boxWidth: number;
  boxHeight: number;
  naturalWidth: number;
  naturalHeight: number;
  /** Extra zoom applied by the block, e.g. the hero background zoom. */
  zoom?: number;
}): CropOverflow => {
  const naturalWidth = input.naturalWidth || 1;
  const naturalHeight = input.naturalHeight || 1;
  const scale = Math.max(input.boxWidth / naturalWidth, input.boxHeight / naturalHeight);
  const zoom = input.zoom === undefined ? 1 : input.zoom;
  return {
    overflowX: Math.max(0, naturalWidth * scale * zoom - input.boxWidth),
    overflowY: Math.max(0, naturalHeight * scale * zoom - input.boxHeight),
  };
};

/** Focal point (0-1) for a drag on an image block, reusing the hero pan maths. */
export const panFocalPoint = (
  frame: Omit<PanFrame, 'baseX' | 'baseY'> & { base: { x: number; y: number } },
  pointerX: number,
  pointerY: number,
): { x: number; y: number } => {
  const next = panPosition(
    { ...frame, baseX: frame.base.x * 100, baseY: frame.base.y * 100 },
    pointerX,
    pointerY,
  );
  return { x: Math.round(next.x) / 100, y: Math.round(next.y) / 100 };
};
