import { useEffect, useRef } from 'react';
import { useT } from './i18n.js';
import type { ReactNode } from 'react';
import { createPortal } from 'react-dom';
import { cn } from './cn.js';

export type ModalSize = 'sm' | 'md' | 'lg';

export interface ModalProps {
  open: boolean;
  title?: ReactNode;
  description?: ReactNode;
  children?: ReactNode;
  footer?: ReactNode;
  size?: ModalSize;
  onClose?: () => void;
  closeLabel?: string;
  className?: string;
}

const canUseDOM = typeof document !== 'undefined';

/** Centered dialog. Fades and scales in, closes on Escape, and traps initial focus. */
export const Modal = ({
  open,
  title,
  description,
  children,
  footer,
  size = 'md',
  onClose,
  closeLabel,
  className,
}: ModalProps) => {
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
    <div className="ui-modal__overlay" onClick={onClose}>
      <div
        ref={panelRef}
        className={cn('ui-modal', `ui-modal--${size}`, className)}
        role="dialog"
        aria-modal="true"
        aria-label={typeof title === 'string' ? title : undefined}
        tabIndex={-1}
        onClick={(event) => event.stopPropagation()}
      >
        {title || onClose ? (
          <header className="ui-modal__header">
            <div>
              {title ? <h2 className="ui-modal__title">{title}</h2> : null}
              {description ? <p className="ui-modal__description">{description}</p> : null}
            </div>
            {onClose ? (
              <button
                type="button"
                className="ui-modal__close"
                aria-label={closeLabel ?? t('common.close')}
                onClick={onClose}
              >
                <span aria-hidden="true">×</span>
              </button>
            ) : null}
          </header>
        ) : null}
        <div className="ui-modal__body">{children}</div>
        {footer ? <footer className="ui-modal__footer">{footer}</footer> : null}
      </div>
    </div>
  );

  return canUseDOM ? createPortal(content, document.body) : content;
};
