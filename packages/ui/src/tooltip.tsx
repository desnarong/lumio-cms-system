import type { ReactNode } from 'react';
import { cn } from './cn.js';

export interface TooltipProps {
  content: ReactNode;
  children: ReactNode;
  placement?: 'top' | 'bottom';
  className?: string;
}

/** Hover/focus tooltip. Purely CSS-driven so it stays SSR-safe and needs no JS. */
export const Tooltip = ({ content, children, placement = 'top', className }: TooltipProps) => (
  <span className={cn('ui-tooltip', className)} data-placement={placement}>
    {children}
    <span className="ui-tooltip__content" role="tooltip">
      {content}
    </span>
  </span>
);
