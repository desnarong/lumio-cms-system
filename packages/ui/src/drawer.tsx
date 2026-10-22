import { useEffect, useRef } from 'react';
import { useT } from './i18n.js';
import type { ReactNode } from 'react';
import { createPortal } from 'react-dom';
import { cn } from './cn.js';

export type DrawerSide = 'right' | 'left';
export type DrawerSize = 'sm' | 'md' | 'lg';

export interface DrawerProps {
  open: boolean;
  title?: ReactNode;
  children?: ReactNode;
  footer?: ReactNode;
  side?: DrawerSide;
  size?: DrawerSize;
  onClose?: () => void;
  closeLabel?: string;
  className?: string;
}

const canUseDOM = typeof document !== 'undefined';

/** Side panel that slides in. Used for the block inspector and long forms. */
export const Drawer = ({
  open,
  title,
  children,
  footer,
  side = 'right',
  size = 'md',
  onClose,
  closeLabel,
  className,
}: DrawerProps) => {
  const t = useT();
  const panelRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open || !canUseDOM) {
      return undefined;
    }
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        onClose?.();
      }
    };
    document.addEventListener('keydown', handleKeyDown);
    panelRef.current?.focus();
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [open, onClose]);

  if (!open) {
    return null;
  }

  const content = (
    <div className="ui-drawer__overlay" onClick={onClose}>
      <div
        ref={panelRef}
        className={cn('ui-drawer', `ui-drawer--${side}`, `ui-drawer--${size}`, className)}
        role="dialog"
        aria-modal="true"
        aria-label={typeof title === 'string' ? title : undefined}
        tabIndex={-1}
        onClick={(event) => event.stopPropagation()}
      >
        <header className="ui-drawer__header">
          {title ? <h2 className="ui-drawer__title">{title}</h2> : <span />}
          {onClose ? (
            <button
              type="button"
              className="ui-drawer__close"
              aria-label={closeLabel ?? t('common.close')}
              onClick={onClose}
            >
              <span aria-hidden="true">×</span>
            </button>
          ) : null}
        </header>
        <div className="ui-drawer__body">{children}</div>
        {footer ? <footer className="ui-drawer__footer">{footer}</footer> : null}
      </div>
    </div>
  );

  return canUseDOM ? createPortal(content, document.body) : content;
};
