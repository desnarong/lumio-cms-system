export interface DropRect {
  top: number;
  height: number;
}

/**
 * Picks the gap a dragged block should land in: the first block whose upper half
 * the pointer crossed, otherwise the end of the list. Keeps the drop indicator
 * honest without any DOM access, so it can be unit tested.
 */
export const resolveDropIndex = (rects: readonly DropRect[], pointerY: number): number => {
  for (let index = 0; index < rects.length; index += 1) {
    const rect = rects[index];
    if (!rect) continue;
    if (pointerY < rect.top + rect.height / 2) return index;
  }
  return rects.length;
};
