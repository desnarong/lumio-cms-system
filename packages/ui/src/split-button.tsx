import { useEffect, useRef, useState } from 'react';
import type { ReactNode } from 'react';
import { Button, type ButtonSize, type ButtonVariant } from './button.js';
import { cn } from './cn.js';
import { useT } from './i18n.js';
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
  const root = useRef<HTMLDivElement>(null);
  const t = useT();

  // The caret menu closes on its own: Escape, a click anywhere else, or losing
  // focus to something outside the button group.
  useEffect(() => {
    if (!open) return undefined;

    const onPointerDown = (event: MouseEvent) => {
      if (!root.current?.contains(event.target as Node)) setOpen(false);
    };
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setOpen(false);
    };
    const onFocusOut = (event: FocusEvent) => {
      if (!root.current?.contains(event.relatedTarget as Node)) setOpen(false);
    };

    document.addEventListener('mousedown', onPointerDown);
    document.addEventListener('keydown', onKeyDown);
    document.addEventListener('focusout', onFocusOut);
    return () => {
      document.removeEventListener('mousedown', onPointerDown);
      document.removeEventListener('keydown', onKeyDown);
      document.removeEventListener('focusout', onFocusOut);
    };
  }, [open]);

  return (
    <div className={cn('ui-split-button', className)} ref={root}>
      <Button variant={variant} size={size} disabled={disabled} onClick={onClick}>
        {children}
      </Button>
      <IconButton
        aria-label={t('shell.moreOptions')}
        aria-haspopup="menu"
        aria-expanded={open}
        variant={variant}
        size={size}
        disabled={disabled || actions.length === 0}
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
