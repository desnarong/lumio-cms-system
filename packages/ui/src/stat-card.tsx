import type { ReactNode } from 'react';
import { cn } from './cn.js';

export type StatTrend = 'up' | 'down' | 'flat';

export interface StatCardProps {
  label: ReactNode;
  value: ReactNode;
  delta?: ReactNode;
  trend?: StatTrend;
  icon?: ReactNode;
  hint?: ReactNode;
  className?: string;
}

const TREND_ICON: Record<StatTrend, string> = {
  up: '▲',
  down: '▼',
  flat: '–',
};

export const StatCard = ({
  label,
  value,
  delta,
  trend = 'flat',
  icon,
  hint,
  className,
}: StatCardProps) => (
  <div className={cn('ui-stat-card', className)}>
    <div className="ui-stat-card__header">
      <span className="ui-stat-card__label">{label}</span>
      {icon ? (
        <span className="ui-stat-card__icon" aria-hidden="true">
          {icon}
        </span>
      ) : null}
    </div>
    <p className="ui-stat-card__value">{value}</p>
    {delta ? (
      <p className={cn('ui-stat-card__delta', `ui-stat-card__delta--${trend}`)}>
        <span aria-hidden="true">{TREND_ICON[trend]}</span>
        <span>{delta}</span>
      </p>
    ) : null}
    {hint ? <p className="ui-stat-card__hint">{hint}</p> : null}
  </div>
);
