import { cn } from './cn.js';

export type ProgressTone = 'primary' | 'success' | 'warning' | 'danger';

export interface ProgressProps {
  value?: number;
  max?: number;
  tone?: ProgressTone;
  label?: string;
  indeterminate?: boolean;
  className?: string;
}

export const Progress = ({
  value = 0,
  max = 100,
  tone = 'primary',
  label,
  indeterminate = false,
  className,
}: ProgressProps) => {
  const percent = max > 0 ? Math.min(100, Math.max(0, (value / max) * 100)) : 0;

  return (
    <div
      className={cn('ui-progress', `ui-progress--${tone}`, className)}
      role="progressbar"
      aria-label={label}
      aria-valuemin={0}
      aria-valuemax={max}
      aria-valuenow={indeterminate ? undefined : value}
    >
      <span
        className={cn('ui-progress__bar', indeterminate && 'ui-progress__bar--indeterminate')}
        style={indeterminate ? undefined : { width: `${percent}%` }}
      />
    </div>
  );
};
