import type { ReactNode } from 'react';
import { useT } from './i18n.js';
import { cn } from './cn.js';

export type BannerTone = 'info' | 'success' | 'warning' | 'danger';

const TONE_ICON: Record<BannerTone, string> = {
  info: 'ℹ',
  success: '✓',
  warning: '⚠',
  danger: '!',
};

export interface BannerProps {
  tone?: BannerTone;
  title?: ReactNode;
  children?: ReactNode;
  action?: ReactNode;
  onDismiss?: () => void;
  dismissLabel?: string;
  className?: string;
}

/** Inline message that stays in the layout (unlike Toast). */
export const Banner = ({
  tone = 'info',
  title,
  children,
  action,
  onDismiss,
  dismissLabel,
  className,
}: BannerProps) => {
  const t = useT();
  return (
  <div className={cn('ui-banner', `ui-banner--${tone}`, className)} role="status">
    <span className="ui-banner__icon" aria-hidden="true">
      {TONE_ICON[tone]}
    </span>
    <div className="ui-banner__body">
      {title ? <p className="ui-banner__title">{title}</p> : null}
      {children ? <div className="ui-banner__content">{children}</div> : null}
    </div>
    {action ? <div className="ui-banner__action">{action}</div> : null}
    {onDismiss ? (
      <button
        type="button"
        className="ui-banner__dismiss"
        aria-label={dismissLabel ?? t('common.dismiss')}
        onClick={onDismiss}
      >
        <span aria-hidden="true">×</span>
      </button>
    ) : null}
  </div>
  );
};
