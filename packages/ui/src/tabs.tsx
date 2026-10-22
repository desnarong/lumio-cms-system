import { useId, useState } from 'react';
import type { ReactNode } from 'react';
import { cn } from './cn.js';

export interface TabItem {
  id: string;
  label: ReactNode;
  content?: ReactNode;
  disabled?: boolean;
  badge?: ReactNode;
}

export interface TabsProps {
  items: TabItem[];
  value?: string;
  defaultValue?: string;
  onChange?: (id: string) => void;
  className?: string;
}

/** Tab list + panels. Arrow keys move between tabs (roving focus is handled natively). */
export const Tabs = ({ items, value, defaultValue, onChange, className }: TabsProps) => {
  const baseId = useId();
  const isControlled = value !== undefined;
  const [internal, setInternal] = useState(defaultValue ?? items[0]?.id ?? '');
  const active = isControlled ? value : internal;
  const activeItem = items.find((item) => item.id === active);

  const select = (id: string) => {
    if (!isControlled) {
      setInternal(id);
    }
    onChange?.(id);
  };

  return (
    <div className={cn('ui-tabs', className)}>
      <div className="ui-tabs__list" role="tablist">
        {items.map((item) => {
          const isActive = item.id === active;
          return (
            <button
              key={item.id}
              type="button"
              role="tab"
              id={`${baseId}-tab-${item.id}`}
              className={cn('ui-tabs__tab', isActive && 'ui-tabs__tab--active')}
              aria-selected={isActive}
              aria-controls={`${baseId}-panel-${item.id}`}
              tabIndex={isActive ? 0 : -1}
              disabled={item.disabled}
              onClick={() => select(item.id)}
            >
              {item.label}
              {item.badge ? <span className="ui-tabs__badge">{item.badge}</span> : null}
            </button>
          );
        })}
      </div>
      {activeItem ? (
        <div
          className="ui-tabs__panel"
          role="tabpanel"
          id={`${baseId}-panel-${activeItem.id}`}
          aria-labelledby={`${baseId}-tab-${activeItem.id}`}
          tabIndex={0}
        >
          {activeItem.content}
        </div>
      ) : null}
    </div>
  );
};
