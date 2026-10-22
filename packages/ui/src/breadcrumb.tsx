import type { ReactNode } from 'react';
import { cn } from './cn.js';
import { useT } from './i18n.js';

export interface BreadcrumbItem {
  label: ReactNode;
  href?: string;
}

export interface BreadcrumbProps {
  items: BreadcrumbItem[];
  ariaLabel?: string;
  className?: string;
}

export const Breadcrumb = ({ items, ariaLabel, className }: BreadcrumbProps) => {
  const t = useT();
  const label = ariaLabel ?? t('breadcrumb.label');
  return (
  <nav className={cn('ui-breadcrumb', className)} aria-label={label}>
    <ol className="ui-breadcrumb__list">
      {items.map((item, index) => {
        const isLast = index === items.length - 1;
        return (
          <li key={`${index}-${String(item.label)}`} className="ui-breadcrumb__item">
            {item.href && !isLast ? (
              <a className="ui-breadcrumb__link" href={item.href}>
                {item.label}
              </a>
            ) : (
              <span className="ui-breadcrumb__current" aria-current={isLast ? 'page' : undefined}>
                {item.label}
              </span>
            )}
            {!isLast ? (
              <span className="ui-breadcrumb__separator" aria-hidden="true">
                /
              </span>
            ) : null}
          </li>
        );
      })}
    </ol>
    </nav>
  );
};
