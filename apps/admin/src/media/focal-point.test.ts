import { describe, expect, it } from 'vitest';
import { focalPointFromPercent, focalPointPercent, objectPositionFor } from './focal-point.js';

describe('focal point percentages', () => {
  it('starts at the centre when the image has no point yet', () => {
    expect(focalPointPercent(null)).toEqual({ x: 50, y: 50 });
    expect(objectPositionFor(undefined)).toBe('50% 50%');
  });

  it('rounds a stored point to whole percentages for the sliders', () => {
    expect(focalPointPercent({ x: 0.123, y: 0.876 })).toEqual({ x: 12, y: 88 });
  });

  it('turns slider values back into a stored point with two decimals', () => {
    expect(focalPointFromPercent({ x: 12, y: 88 })).toEqual({ x: 0.12, y: 0.88 });
  });

  it('clamps values so a stray input cannot leave the image', () => {
    expect(focalPointFromPercent({ x: -20, y: 180 })).toEqual({ x: 0, y: 1 });
    expect(focalPointPercent({ x: 2, y: -1 })).toEqual({ x: 100, y: 0 });
  });

  it('writes the CSS the preview and the site share', () => {
    expect(objectPositionFor({ x: 0.2, y: 0.8 })).toBe('20% 80%');
  });
});
