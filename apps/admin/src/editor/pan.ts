/** Everything the hero drag needs to turn a pointer move into a background position. */
export interface PanFrame {
  startX: number;
  startY: number;
  /** Position shown in the panel when the drag started (0-100). */
  baseX: number;
  baseY: number;
  /** Canvas scale, so a zoomed preview maps to page pixels. */
  scale: number;
  /** Pixels of picture hidden past each edge at the current zoom. */
  overflowX: number;
  overflowY: number;
}

const clampPercent = (value: number): number => Math.min(100, Math.max(0, Math.round(value)));

/**
 * Background position for a drag. The picture follows the pointer, so dragging
 * right lowers the horizontal percentage (which shows more of the left side).
 */
export const panPosition = (
  frame: PanFrame,
  pointerX: number,
  pointerY: number,
): { x: number; y: number } => {
  const scale = frame.scale || 1;
  const dx = (pointerX - frame.startX) / scale;
  const dy = (pointerY - frame.startY) / scale;
  return {
    x:
      frame.overflowX > 0
        ? clampPercent(frame.baseX - (dx / frame.overflowX) * 100)
        : clampPercent(frame.baseX),
    y:
      frame.overflowY > 0
        ? clampPercent(frame.baseY - (dy / frame.overflowY) * 100)
        : clampPercent(frame.baseY),
  };
};
