import type { ReactNode } from 'react';
import { cn } from './cn.js';

export interface SidebarItem {
  id: string;
  label: ReactNode;
  href?: string;
  icon?: ReactNode;
  active?: boolean;
  badge?: ReactNode;
  disabled?: boolean;
}

export interface SidebarProps {
  items: SidebarItem[];
  header?: ReactNode;
  footer?: ReactNode;
  collapsed?: boolean;
  ariaLabel?: string;
  className?: string;
  onNavigate?: (id: string) => void;
}

const itemClass = (item: SidebarItem): string =>
  cn('ui-sidebar__link', item.active && 'ui-sidebar__link--active', item.disabled && 'is-disabled');

/** Admin navigation rail: 240px wide, collapses to a 72px icon strip. */
export const Sidebar = ({
  items,
  header,
  footer,
  collapsed = false,
  ariaLabel = 'เมนูหลัก',
  className,
  onNavigate,
}: SidebarProps) => (
  <nav
    className={cn('ui-sidebar', collapsed && 'ui-sidebar--collapsed', className)}
    aria-label={ariaLabel}
  >
    {header ? <div className="ui-sidebar__header">{header}</div> : null}
    <ul className="ui-sidebar__list">
      {items.map((item) => {
        const content = (
          <>
            {item.icon ? (
              <span className="ui-sidebar__icon" aria-hidden="true">
                {item.icon}
              </span>
            ) : null}
            <span className="ui-sidebar__label">{item.label}</span>
            {item.badge ? <span className="ui-sidebar__badge">{item.badge}</span> : null}
          </>
        );

        return (
          <li key={item.id} className="ui-sidebar__item">
            {item.href && !item.disabled ? (
              <a
                className={itemClass(item)}
                href={item.href}
                aria-current={item.active ? 'page' : undefined}
              >
                {content}
              </a>
            ) : (
              <button
                type="button"
                className={itemClass(item)}
                aria-current={item.active ? 'page' : undefined}
                disabled={item.disabled}
                onClick={() => onNavigate?.(item.id)}
              >
                {content}
              </button>
            )}
          </li>
        );
      })}
    </ul>
    {footer ? <div className="ui-sidebar__footer">{footer}</div> : null}
  </nav>
);
