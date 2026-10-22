import type { ButtonHTMLAttributes, ReactNode } from 'react';
import type { ButtonSize, ButtonVariant } from './button.js';
import { cn } from './cn.js';

export interface IconButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  /** Required: an icon alone has no accessible name. */
  'aria-label': string;
  variant?: ButtonVariant;
  size?: ButtonSize;
  children: ReactNode;
}

/** Square button for a single icon. `aria-label` is mandatory for accessibility. */
export const IconButton = ({
  variant = 'ghost',
  size = 'md',
  type = 'button',
  className,
  children,
  ...rest
}: IconButtonProps) => (
  <button
    type={type}
    className={cn(
      'ui-button',
      `ui-button--${variant}`,
      `ui-button--${size}`,
      'ui-button--icon',
      className,
    )}
    {...rest}
  >
    {children}
  </button>
);
