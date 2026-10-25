import { describe, expect, it } from 'vitest';
import { panPosition } from './pan';

const frame = {
  startX: 100,
  startY: 100,
  baseX: 50,
  baseY: 50,
  scale: 1,
  overflowX: 400,
  overflowY: 200,
};

describe('panPosition', () => {
  it('moves the picture with the pointer', () => {
    // Dragging right by a quarter of the hidden width shifts the position left.
    expect(panPosition(frame, 200, 100)).toEqual({ x: 25, y: 50 });
    expect(panPosition(frame, 0, 100)).toEqual({ x: 75, y: 50 });
  });

  it('follows the pointer vertically too', () => {
    expect(panPosition(frame, 100, 150)).toEqual({ x: 50, y: 25 });
  });

  it('accounts for the preview scale', () => {
    expect(panPosition({ ...frame, scale: 0.5 }, 200, 100)).toEqual({ x: 0, y: 50 });
  });

  it('clamps to the panel range', () => {
    expect(panPosition(frame, -10_000, 10_000)).toEqual({ x: 100, y: 0 });
  });

  it('keeps an axis still when nothing is hidden there', () => {
    expect(panPosition({ ...frame, overflowX: 0 }, 500, 100)).toEqual({ x: 50, y: 50 });
  });
});
