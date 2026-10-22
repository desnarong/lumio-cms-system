import { useState } from 'react';
import type { ReactNode } from 'react';
import { Button, type ButtonSize, type ButtonVariant } from './button.js';
import { cn } from './cn.js';
import { IconButton } from './icon-button.js';

export interface SplitButtonAction {
  label: string;
  onSelect?: () => void;
  disabled?: boolean;
}

export interface SplitButtonProps {
  children: ReactNode;
  onClick?: () => void;
  actions?: SplitButtonAction[];
  variant?: ButtonVariant;
  size?: ButtonSize;
  disabled?: boolean;
  className?: string;
}

/** Primary action with a caret that reveals secondary actions. */
export const SplitButton = ({
  children,
  onClick,
  actions = [],
  variant = 'primary',
  size = 'md',
  disabled = false,
  className,
}: SplitButtonProps) => {
  const [open, setOpen] = useState(false);

  return (
    <div className={cn('ui-split-button', className)}>
      <Button variant={variant} size={size} disabled={disabled} onClick={onClick}>
        {children}
      </Button>
      <IconButton
        aria-label="ตัวเลือกเพิ่มเติม"
        aria-haspopup="menu"
        aria-expanded={open}
        variant={variant}
        size={size}
        disabled={disabled}
        className="ui-split-button__caret"
        onClick={() => setOpen((value) => !value)}
      >
        <span aria-hidden="true">▾</span>
      </IconButton>
      {open && actions.length > 0 ? (
        <div className="ui-split-button__menu" role="menu">
          {actions.map((action) => (
            <button
              key={action.label}
              type="button"
              role="menuitem"
              className="ui-split-button__item"
              disabled={action.disabled}
              onClick={() => {
                setOpen(false);
                action.onSelect?.();
              }}
            >
              {action.label}
            </button>
          ))}
        </div>
      ) : null}
    </div>
  );
};
