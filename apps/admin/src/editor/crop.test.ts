import { describe, expect, it } from 'vitest';
import { coverOverflow, panFocalPoint } from './crop';

describe('coverOverflow', () => {
  it('reports only the axis a cover crop hides', () => {
    // A wide picture in a square frame is cropped left/right, not top/bottom.
    const overflow = coverOverflow({
      boxWidth: 400,
      boxHeight: 400,
      naturalWidth: 1200,
      naturalHeight: 600,
    });

    expect(overflow.overflowX).toBe(400);
    expect(overflow.overflowY).toBe(0);
  });

  it('hides more when the block zooms in', () => {
    const base = coverOverflow({
      boxWidth: 400,
      boxHeight: 400,
      naturalWidth: 800,
      naturalHeight: 400,
    });
    const zoomed = coverOverflow({
      boxWidth: 400,
      boxHeight: 400,
      naturalWidth: 800,
      naturalHeight: 400,
      zoom: 1.5,
    });

    expect(zoomed.overflowX).toBeGreaterThan(base.overflowX);
  });

  it('has no overflow when the picture already fits', () => {
    const overflow = coverOverflow({
      boxWidth: 400,
      boxHeight: 300,
      naturalWidth: 400,
      naturalHeight: 300,
    });

    expect(overflow).toEqual({ overflowX: 0, overflowY: 0 });
  });
});

describe('panFocalPoint', () => {
  const frame = {
    startX: 0,
    startY: 0,
    base: { x: 0.5, y: 0.5 },
    scale: 1,
    overflowX: 400,
    overflowY: 200,
  };

  it('moves the focal point opposite to the pointer', () => {
    expect(panFocalPoint(frame, 200, 50)).toEqual({ x: 0, y: 0.25 });
  });

  it('stays inside the picture', () => {
    expect(panFocalPoint(frame, 10_000, 10_000)).toEqual({ x: 0, y: 0 });
  });
});
