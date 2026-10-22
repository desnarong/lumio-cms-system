import type { HTMLAttributes, ReactNode } from 'react';
import { cn } from './cn.js';

export interface CardProps extends HTMLAttributes<HTMLDivElement> {
  children: ReactNode;
}

export const Card = ({ className, children, ...rest }: CardProps) => (
  <div className={cn('ui-card', className)} {...rest}>
    {children}
  </div>
);
