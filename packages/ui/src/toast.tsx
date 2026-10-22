import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import type { ReactNode } from 'react';
import { cn } from './cn.js';
import { Icon, type IconName } from './icon.js';

export type ToastTone = 'info' | 'success' | 'warning' | 'danger';

const TONE_ICON: Record<ToastTone, IconName> = {
  info: 'info',
  success: 'check',
  warning: 'alert-triangle',
  danger: 'alert-circle',
};

export interface ToastAction {
  label: string;
  onClick?: () => void;
}

export interface ToastProps {
  tone?: ToastTone;
  title: ReactNode;
  description?: ReactNode;
  action?: ToastAction;
  onDismiss?: () => void;
  dismissLabel?: string;
  className?: string;
}

/** Presentational toast. Use `useToast()` for the auto-dismissing stack. */
export const Toast = ({
  tone = 'info',
  title,
  description,
  action,
  onDismiss,
  dismissLabel = 'ปิด',
  className,
}: ToastProps) => (
  <div className={cn('ui-toast', `ui-toast--${tone}`, className)} role="status">
    <span className="ui-toast__icon" aria-hidden="true">
      <Icon name={TONE_ICON[tone]} size={18} />
    </span>
    <div className="ui-toast__body">
      <p className="ui-toast__title">{title}</p>
      {description ? <p className="ui-toast__description">{description}</p> : null}
    </div>
    {action ? (
      <button type="button" className="ui-toast__action" onClick={action.onClick}>
        {action.label}
      </button>
    ) : null}
    {onDismiss ? (
      <button
        type="button"
        className="ui-toast__dismiss"
        aria-label={dismissLabel}
        onClick={onDismiss}
      >
        <Icon name="close" size={16} />
      </button>
    ) : null}
  </div>
);

export interface ToastOptions {
  title: string;
  description?: string;
  tone?: ToastTone;
  /** Auto-dismiss delay in ms. Use 0 to keep the toast until dismissed. */
  duration?: number;
  action?: ToastAction;
  /** Shorthand for the undo button every destructive action should offer. */
  undo?: { label?: string; onClick: () => void };
}

export interface ToastItem extends ToastOptions {
  id: string;
  tone: ToastTone;
  duration: number;
}

export interface ToastContextValue {
  toasts: ToastItem[];
  push: (options: ToastOptions) => string;
  dismiss: (id: string) => void;
  dismissAll: () => void;
}

const ToastContext = createContext<ToastContextValue | null>(null);

const DEFAULT_DURATION = 5000;

export interface ToastProviderProps {
  children: ReactNode;
  /** Extra classes for the viewport. */
  className?: string;
}

export const ToastProvider = ({ children, className }: ToastProviderProps) => {
  const [toasts, setToasts] = useState<ToastItem[]>([]);
  const counter = useRef(0);

  const dismiss = useCallback((id: string) => {
    setToasts((current) => current.filter((toast) => toast.id !== id));
  }, []);

  const dismissAll = useCallback(() => setToasts([]), []);

  const push = useCallback((options: ToastOptions) => {
    counter.current += 1;
    const id = `toast-${counter.current}`;
    setToasts((current) => [
      ...current,
      {
        ...options,
        id,
        tone: options.tone ?? 'info',
        duration: options.duration ?? DEFAULT_DURATION,
      },
    ]);
    return id;
  }, []);

  const value = useMemo<ToastContextValue>(
    () => ({ toasts, push, dismiss, dismissAll }),
    [toasts, push, dismiss, dismissAll],
  );

  return (
    <ToastContext.Provider value={value}>
      {children}
      <div className={cn('ui-toast-viewport', className)} aria-live="polite" aria-atomic="false">
        {toasts.map((toast) => (
          <ToastItemView key={toast.id} item={toast} onDismiss={dismiss} />
        ))}
      </div>
    </ToastContext.Provider>
  );
};

interface ToastItemViewProps {
  item: ToastItem;
  onDismiss: (id: string) => void;
}

const ToastItemView = ({ item, onDismiss }: ToastItemViewProps) => {
  useEffect(() => {
    if (item.duration <= 0) {
      return undefined;
    }
    const timer = setTimeout(() => onDismiss(item.id), item.duration);
    return () => clearTimeout(timer);
  }, [item.duration, item.id, onDismiss]);

  const action: ToastAction | undefined =
    item.action ??
    (item.undo ? { label: item.undo.label ?? 'เลิกทำ', onClick: item.undo.onClick } : undefined);

  return (
    <Toast
      tone={item.tone}
      title={item.title}
      description={item.description}
      action={action}
      onDismiss={() => onDismiss(item.id)}
    />
  );
};

export const useToast = (): ToastContextValue => {
  const context = useContext(ToastContext);
  if (!context) {
    throw new Error('useToast ต้องถูกเรียกภายใน <ToastProvider>');
  }
  return context;
};
