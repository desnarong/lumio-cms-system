import type { FocalPoint } from '@lumio/shared';

/** Percent values the inspector sliders speak in (0-100, whole numbers). */
export interface FocalPercent {
  x: number;
  y: number;
}

const clampPercent = (value: number): number =>
  Number.isFinite(value) ? Math.min(100, Math.max(0, Math.round(value))) : 50;

/** A stored point (0-1) as slider percentages; centre when none is set. */
export const focalPointPercent = (point: FocalPoint | null | undefined): FocalPercent => ({
  x: clampPercent((point?.x ?? 0.5) * 100),
  y: clampPercent((point?.y ?? 0.5) * 100),
});

/** Slider percentages back to the stored 0-1 point, with two decimals. */
export const focalPointFromPercent = (percent: FocalPercent): FocalPoint => ({
  x: clampPercent(percent.x) / 100,
  y: clampPercent(percent.y) / 100,
});

/** CSS `object-position` for a point, so previews crop exactly like the site. */
export const objectPositionFor = (point: FocalPoint | null | undefined): string => {
  const percent = focalPointPercent(point);
  return `${percent.x}% ${percent.y}%`;
};
