import type { InputHTMLAttributes } from 'react';
import { cn } from './cn.js';

export interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  invalid?: boolean;
}

export const Input = ({ className, invalid = false, ...rest }: InputProps) => (
  <input
    className={cn('ui-input', invalid && 'ui-input--invalid', className)}
    aria-invalid={invalid || undefined}
    {...rest}
  />
);
