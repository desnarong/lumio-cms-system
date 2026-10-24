import {
  useEffect,
  useMemo,
  useRef,
  useState,
  type CSSProperties,
  type KeyboardEvent as ReactKeyboardEvent,
} from 'react';
import { filterBlockCatalog, listBlockCatalog } from '@lumio/blocks';
import type { SectionTemplate } from '@lumio/shared';
import { Icon, IconButton, useT, useUiLocale, type IconName } from '@lumio/ui';
import { cn } from '@lumio/ui/cn';

/** Glyph per block icon name; a plain square stands in for anything unmapped. */
const BLOCK_ICONS: Record<string, IconName> = {
  heading: 'type',
  paragraph: 'align-left',
  image: 'image',
  button: 'link',
  layout: 'layout',
  grid: 'grid',
  hero: 'layout',
  features: 'grid',
  gallery: 'image',
  quote: 'book',
  cta: 'zap',
  testimonials: 'star',
  pricing: 'tag',
  faq: 'info',
  contact: 'mail',
  form: 'inbox',
  video: 'play',
  map: 'map-pin',
  team: 'users',
  stats: 'chart-bar',
  logos: 'layers',
  newsletter: 'send',
  product: 'package',
  products: 'package',
  posts: 'book',
  cart: 'cart',
  languages: 'globe',
  'language-switcher': 'globe',
  footer: 'layout',
  header: 'layout',
  countdown: 'clock',
  menu: 'list',
  slider: 'layers',
};

export interface SlashMenuProps {
  onPick: (type: string) => void;
  onClose: () => void;
  /** Viewport position of the row that opened the panel. */
  top?: number;
  left?: number;
  /** Sections the user saved from this site (docs/design/07-blocks.md 7.2). */
  sections?: SectionTemplate[];
  onPickSection?: (sectionId: string) => void;
}

type Choice =
  | { kind: 'block'; type: string; label: string; icon?: string }
  | { kind: 'section'; id: string; label: string };

const matches = (label: string, needle: string): boolean =>
  needle.length === 0 || label.toLowerCase().includes(needle);

/** Notion-style `/` menu: search, arrow keys, Enter to insert (docs/design/04-ux.md 4.2). */
export const SlashMenu = ({
  onPick,
  onClose,
  top = 12,
  left = 12,
  sections = [],
  onPickSection,
}: SlashMenuProps) => {
  const t = useT();
  const locale = useUiLocale();
  const [query, setQuery] = useState('');
  const [activeIndex, setActiveIndex] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);

  const needle = query.trim().toLowerCase();
  const groups = useMemo(
    () => filterBlockCatalog(listBlockCatalog(undefined, locale), query),
    [query, locale],
  );

  const savedSections = useMemo(
    () => sections.filter((section) => matches(section.name, needle)),
    [sections, needle],
  );

  const choices = useMemo<Choice[]>(
    () => [
      ...savedSections.map((section) => ({
        kind: 'section' as const,
        id: section.id,
        label: section.name,
      })),
      ...groups.flatMap((group) =>
        group.blocks.map((block) => ({
          kind: 'block' as const,
          type: block.type,
          label: block.label,
          icon: block.icon,
        })),
      ),
    ],
    [groups, savedSections],
  );

  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  // Escape must close the panel even after the pointer moved focus away.
  useEffect(() => {
    const onKey = (event: globalThis.KeyboardEvent): void => {
      if (event.key !== 'Escape') return;
      event.preventDefault();
      onClose();
    };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [onClose]);

  useEffect(() => {
    setActiveIndex(0);
  }, [query]);

  const choose = (choice: Choice | undefined): void => {
    if (!choice) return;
    if (choice.kind === 'block') onPick(choice.type);
    else if (onPickSection) onPickSection(choice.id);
  };

  const handleKeyDown = (event: ReactKeyboardEvent<HTMLInputElement>): void => {
    if (event.key === 'ArrowDown') {
      event.preventDefault();
      setActiveIndex((current) => (choices.length === 0 ? 0 : (current + 1) % choices.length));
      return;
    }
    if (event.key === 'ArrowUp') {
      event.preventDefault();
      setActiveIndex((current) =>
        choices.length === 0 ? 0 : (current - 1 + choices.length) % choices.length,
      );
      return;
    }
    if (event.key === 'Enter') {
      event.preventDefault();
      choose(choices[activeIndex]);
    }
  };

  return (
    <div className="editor-slash-layer" onClick={onClose}>
      <div
        className="editor-slash"
        role="dialog"
        aria-modal="true"
        aria-label={t('editor.slash.label')}
        style={{ '--slash-top': `${top}px`, '--slash-left': `${left}px` } as CSSProperties}
        onClick={(event) => event.stopPropagation()}
      >
        <header className="editor-slash__header">
          <span className="editor-slash__title">{t('editor.slash.label')}</span>
          <IconButton
            size="sm"
            aria-label={t('common.close')}
            title={t('common.close')}
            onClick={onClose}
          >
            <Icon name="close" size={16} />
          </IconButton>
        </header>
        <input
        ref={inputRef}
        className="editor-slash__input"
        type="search"
        value={query}
        placeholder={t('editor.slash.placeholder')}
        aria-label={t('editor.slash.searchLabel')}
        onChange={(event) => setQuery(event.target.value)}
        onKeyDown={handleKeyDown}
      />

      <div className="editor-slash__list">
        {choices.length === 0 ? (
          <p className="editor-slash__empty">{t('editor.slash.empty')}</p>
        ) : null}

        {savedSections.length > 0 ? (
          <section className="editor-slash__group">
            <h3 className="editor-slash__group-title">{t('editor.slash.myTemplates')}</h3>
            <ul className="editor-slash__options">
              {savedSections.map((section) => {
                const index = choices.findIndex(
                  (choice) => choice.kind === 'section' && choice.id === section.id,
                );
                return (
                  <li key={section.id}>
                    <button
                      type="button"
                      className={cn('editor-slash__option', index === activeIndex && 'is-active')}
                      onClick={() =>
                        choose({ kind: 'section', id: section.id, label: section.name })
                      }
                      onMouseEnter={() => setActiveIndex(index)}
                    >
                      <span className="editor-slash__icon" aria-hidden="true">
                        <Icon name="save" size={16} />
                      </span>
                      {section.name}
                    </button>
                  </li>
                );
              })}
            </ul>
          </section>
        ) : null}

        {groups.map((group) => (
          <section className="editor-slash__group" key={group.category}>
            <h3 className="editor-slash__group-title">{group.label}</h3>
            <ul className="editor-slash__options">
              {group.blocks.map((block) => {
                const index = choices.findIndex(
                  (choice) => choice.kind === 'block' && choice.type === block.type,
                );
                return (
                  <li key={block.type}>
                    <button
                      type="button"
                      className={cn('editor-slash__option', index === activeIndex && 'is-active')}
                      onClick={() =>
                        choose({ kind: 'block', type: block.type, label: block.label })
                      }
                      onMouseEnter={() => setActiveIndex(index)}
                    >
                      <span className="editor-slash__icon" aria-hidden="true">
                        <Icon name={BLOCK_ICONS[block.type] ?? 'grid'} size={18} />
                      </span>
                      {block.label}
                    </button>
                  </li>
                );
              })}
            </ul>
          </section>
        ))}
      </div>
      </div>
    </div>
  );
};
