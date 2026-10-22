import { useEffect, useRef, useState } from 'react';
import type { ReactNode } from 'react';
import { cn } from './cn.js';

export interface PopoverProps {
  /** Rendered inside the trigger button. */
  trigger: ReactNode;
  triggerLabel: string;
  children: ReactNode;
  open?: boolean;
  defaultOpen?: boolean;
  align?: 'start' | 'end';
  className?: string;
  onOpenChange?: (open: boolean) => void;
}

const canUseDOM = typeof document !== 'undefined';

/** Anchored floating panel that closes on outside click or Escape. */
export const Popover = ({
  trigger,
  triggerLabel,
  children,
  open,
  defaultOpen = false,
  align = 'start',
  className,
  onOpenChange,
}: PopoverProps) => {
  const isControlled = open !== undefined;
  const [internal, setInternal] = useState(defaultOpen);
  const isOpen = isControlled ? open : internal;
  const rootRef = useRef<HTMLDivElement>(null);

  const setOpen = (next: boolean) => {
    if (!isControlled) {
      setInternal(next);
    }
    onOpenChange?.(next);
  };

  useEffect(() => {
    if (!isOpen || !canUseDOM) {
      return undefined;
    }
    const handlePointerDown = (event: MouseEvent) => {
      if (!rootRef.current?.contains(event.target as Node)) {
        setOpen(false);
      }
    };
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setOpen(false);
      }
    };
    document.addEventListener('mousedown', handlePointerDown);
    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('mousedown', handlePointerDown);
      document.removeEventListener('keydown', handleKeyDown);
    };
  });

  return (
    <div className={cn('ui-popover', className)} ref={rootRef}>
      <button
        type="button"
        className="ui-popover__trigger"
        aria-label={triggerLabel}
        aria-haspopup="dialog"
        aria-expanded={isOpen}
        onClick={() => setOpen(!isOpen)}
      >
        {trigger}
      </button>
      {isOpen ? (
        <div className={cn('ui-popover__panel', `ui-popover__panel--${align}`)} role="dialog">
          {children}
        </div>
      ) : null}
    </div>
  );
};
