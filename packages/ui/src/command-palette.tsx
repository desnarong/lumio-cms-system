import { useT } from './i18n.js';
import { useEffect, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { cn } from './cn.js';
import { Icon } from './icon.js';

export interface CommandPaletteEntry {
  id: string;
  label: string;
  /** Short line under the label, e.g. the page path. */
  hint?: string;
}

export interface CommandPaletteSection {
  id: string;
  label: string;
  items: CommandPaletteEntry[];
}

export interface CommandPaletteProps {
  open: boolean;
  /** Search text; the caller owns it so it can filter before rendering. */
  query: string;
  /** Already-filtered, already-grouped commands. */
  sections: CommandPaletteSection[];
  placeholder?: string;
  emptyText?: string;
  onQueryChange: (value: string) => void;
  onSelect: (entry: CommandPaletteEntry) => void;
  onClose: () => void;
}

const canUseDOM = typeof document !== 'undefined';

/**
 * Command palette (docs/design/04-ux.md 4.3). Presentational on purpose: the
 * caller filters and groups the commands, so this only handles focus, keyboard
 * navigation and rendering. It always restarts on the first entry when the
 * result list changes.
 */
export const CommandPalette = ({
  open,
  query,
  sections,
  placeholder,
  emptyText,
  onQueryChange,
  onSelect,
  onClose,
}: CommandPaletteProps) => {
  const t = useT();
  const inputRef = useRef<HTMLInputElement>(null);
  const [activeIndex, setActiveIndex] = useState(0);

  const flat = useMemo(() => sections.flatMap((section) => section.items), [sections]);

  useEffect(() => {
    setActiveIndex(0);
  }, [sections]);

  useEffect(() => {
    if (!open || !canUseDOM) return undefined;
    inputRef.current?.focus();

    const handleKeyDown = (event: KeyboardEvent): void => {
      if (event.key === 'Escape') {
        onClose();
        return;
      }
      if (flat.length === 0) return;
      if (event.key === 'ArrowDown') {
        event.preventDefault();
        setActiveIndex((index) => (index + 1) % flat.length);
      } else if (event.key === 'ArrowUp') {
        event.preventDefault();
        setActiveIndex((index) => (index - 1 + flat.length) % flat.length);
      } else if (event.key === 'Enter') {
        const entry = flat[activeIndex];
        if (entry) {
          event.preventDefault();
          onSelect(entry);
        }
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [open, flat, activeIndex, onClose, onSelect]);

  if (!open) return null;

  let index = -1;

  const content = (
    <div className="ui-command__overlay" onClick={onClose}>
      <div
        className="ui-command"
        role="dialog"
        aria-modal="true"
        aria-label={t('palette.searchLabel')}
        onClick={(event) => event.stopPropagation()}
      >
        <div className="ui-command__search">
          <span className="ui-command__icon" aria-hidden="true">
            <Icon name="search" size={16} />
          </span>
          <input
            ref={inputRef}
            className="ui-command__input"
            type="search"
            role="combobox"
            aria-expanded="true"
            aria-controls="ui-command-list"
            aria-autocomplete="list"
            placeholder={placeholder ?? t('palette.placeholder')}
            value={query}
            onChange={(event) => onQueryChange(event.target.value)}
          />
          <kbd className="ui-command__hint">Esc</kbd>
        </div>

        <div className="ui-command__list" id="ui-command-list" role="listbox">
          {flat.length === 0 ? (
            <p className="ui-command__empty">{emptyText ?? t('palette.empty')}</p>
          ) : (
            sections.map((section) => (
              <div key={section.id} className="ui-command__section">
                <p className="ui-command__section-title">{section.label}</p>
                {section.items.map((item) => {
                  index += 1;
                  const active = index === activeIndex;
                  return (
                    <button
                      key={item.id}
                      type="button"
                      className={cn('ui-command__item', active && 'ui-command__item--active')}
                      role="option"
                      aria-selected={active}
                      onMouseEnter={() => setActiveIndex(flat.indexOf(item))}
                      onClick={() => onSelect(item)}
                    >
                      <span className="ui-command__item-label">{item.label}</span>
                      {item.hint ? (
                        <span className="ui-command__item-hint">{item.hint}</span>
                      ) : null}
                    </button>
                  );
                })}
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );

  return canUseDOM ? createPortal(content, document.body) : content;
};
