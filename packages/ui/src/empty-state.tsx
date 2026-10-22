import type { ReactNode } from 'react';
import { cn } from './cn.js';

export interface EmptyStateProps {
  illustration?: ReactNode;
  title: ReactNode;
  description?: ReactNode;
  action?: ReactNode;
  /** `error` swaps the soft illustration for a warning tone and invites a retry. */
  tone?: 'neutral' | 'error';
  className?: string;
}

/** The shared empty / error state: illustration + message + a next step. */
export const EmptyState = ({
  illustration,
  title,
  description,
  action,
  tone = 'neutral',
  className,
}: EmptyStateProps) => (
  <div className={cn('ui-empty-state', `ui-empty-state--${tone}`, className)}>
    <div className="ui-empty-state__illustration" aria-hidden="true">
      {illustration ?? (tone === 'error' ? '⚠' : '✦')}
    </div>
    <p className="ui-empty-state__title">{title}</p>
    {description ? <p className="ui-empty-state__description">{description}</p> : null}
    {action ? <div className="ui-empty-state__action">{action}</div> : null}
  </div>
);
