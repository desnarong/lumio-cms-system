import type { CSSProperties } from 'react';
import { cn } from './cn.js';

export type SkeletonShape = 'text' | 'block' | 'circle';

export interface SkeletonProps {
  shape?: SkeletonShape;
  width?: string | number;
  height?: string | number;
  lines?: number;
  className?: string;
}

const toSize = (value: string | number | undefined): string | undefined =>
  typeof value === 'number' ? `${value}px` : value;

/** Loading placeholder. Never a bare spinner for content areas. */
export const Skeleton = ({
  shape = 'block',
  width,
  height,
  lines = 1,
  className,
}: SkeletonProps) => {
  const style: CSSProperties = { width: toSize(width), height: toSize(height) };

  if (shape === 'text' && lines > 1) {
    return (
      <span className={cn('ui-skeleton-group', className)} aria-hidden="true">
        {Array.from({ length: lines }, (_, index) => (
          <span
            key={index}
            className="ui-skeleton ui-skeleton--text"
            style={{ ...style, width: index === lines - 1 ? '60%' : style.width }}
          />
        ))}
      </span>
    );
  }

  return (
    <span
      className={cn('ui-skeleton', `ui-skeleton--${shape}`, className)}
      style={style}
      aria-hidden="true"
    />
  );
};
