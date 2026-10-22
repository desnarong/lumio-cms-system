import { useState, type ReactNode } from 'react';
import { localeLabel, type MenuItem, type MenuLocation } from '@lumio/shared';
import { Button, EmptyState, Skeleton, Tabs, TextField, useT, type MessageKey } from '@lumio/ui';
import type { DesignApi } from './api.js';
import { useMenu } from './hooks.js';

const LOCATION_LABEL_KEYS: Record<MenuLocation, MessageKey> = {
  header: 'menus.header',
  footer: 'menus.footer',
};

const emptyItem = (): MenuItem => ({ label: '', href: '', children: [] });

const replaceAt = (items: MenuItem[], index: number, next: MenuItem): MenuItem[] =>
  items.map((item, position) => (position === index ? next : item));

const removeAt = (items: MenuItem[], index: number): MenuItem[] =>
  items.filter((_, position) => position !== index);

interface MenuNodeProps {
  item: MenuItem;
  depth: number;
  onChange: (next: MenuItem) => void;
  onRemove: () => void;
  onAddChild?: () => void;
  children?: ReactNode;
}

const MenuNode = ({ item, depth, onChange, onRemove, onAddChild, children }: MenuNodeProps) => {
  const t = useT();

  return (
    <li className="menu-node" style={{ marginLeft: depth > 0 ? 'var(--space-xl)' : 0 }}>
      <div className="menu-node__row">
        <TextField
          label={depth === 0 ? t('menus.itemLabel') : t('menus.childLabel')}
          value={item.label}
          placeholder={t('menus.itemPlaceholder')}
          onChange={(event) => onChange({ ...item, label: event.target.value })}
        />
        <TextField
          label={t('menus.hrefLabel')}
          value={item.href ?? ''}
          placeholder="/services"
          hint={t('menus.hrefHint')}
          onChange={(event) => onChange({ ...item, href: event.target.value })}
        />
        <div className="menu-node__actions">
          {onAddChild ? (
            <Button variant="ghost" size="sm" onClick={onAddChild}>
              {t('menus.addChild')}
            </Button>
          ) : null}
          <Button variant="ghost" size="sm" onClick={onRemove}>
            {t('common.delete')}
          </Button>
        </div>
      </div>
      {children ? <ul className="menu-node__children">{children}</ul> : null}
    </li>
  );
};

const MenuEditor = ({
  items,
  onChange,
}: {
  items: MenuItem[];
  onChange: (items: MenuItem[]) => void;
}) => {
  const t = useT();

  return (
    <div className="menu-editor">
      {items.length === 0 ? (
        <p className="menu-editor__empty">{t('menus.empty')}</p>
      ) : (
        <ul className="menu-editor__list">
          {items.map((item, index) => (
            <MenuNode
              key={`${item.label}-${index}`}
              item={item}
              depth={0}
              onChange={(next) => onChange(replaceAt(items, index, next))}
              onRemove={() => onChange(removeAt(items, index))}
              onAddChild={() =>
                onChange(
                  replaceAt(items, index, { ...item, children: [...item.children, emptyItem()] }),
                )
              }
            >
              {item.children.map((child, childIndex) => (
                <MenuNode
                  key={`${child.label}-${childIndex}`}
                  item={child}
                  depth={1}
                  onChange={(next) =>
                    onChange(
                      replaceAt(items, index, {
                        ...item,
                        children: replaceAt(item.children, childIndex, next),
                      }),
                    )
                  }
                  onRemove={() =>
                    onChange(
                      replaceAt(items, index, {
                        ...item,
                        children: removeAt(item.children, childIndex),
                      }),
                    )
                  }
                />
              ))}
            </MenuNode>
          ))}
        </ul>
      )}

      <Button variant="secondary" onClick={() => onChange([...items, emptyItem()])}>
        {t('menus.add')}
      </Button>
    </div>
  );
};

const LocationEditor = ({
  api,
  location,
  locale,
}: {
  api: DesignApi;
  location: MenuLocation;
  locale?: string;
}) => {
  const t = useT();
  const menu = useMenu(api, location, locale);

  if (menu.loading) {
    return <Skeleton shape="block" height={220} />;
  }

  if (menu.error && menu.items.length === 0) {
    return (
      <EmptyState
        tone="error"
        title={t('menus.loadError')}
        description={menu.error}
        action={
          <Button variant="secondary" onClick={() => void menu.reload()}>
            {t('common.retry')}
          </Button>
        }
      />
    );
  }

  return (
    <div className="design-panel">
      <MenuEditor items={menu.items} onChange={menu.setItems} />
      <div className="design-actions">
        <Button variant="primary" disabled={menu.saving} onClick={() => void menu.save()}>
          {menu.saving ? t('design.savingDots') : t('menus.save')}
        </Button>
        {menu.error ? (
          <span className="design-error" role="alert">
            {menu.error}
          </span>
        ) : null}
      </div>
    </div>
  );
};

export interface MenusPanelProps {
  api: DesignApi;
  /** Languages the site offers; an empty list means one shared menu. */
  locales?: string[];
}

/** The shared menu key: it serves every language the site does not override. */
const SHARED = 'shared';

/**
 * Menu tab: the top and bottom navigation (menus may nest one level). When the
 * site offers several languages, each one can have its own menu; otherwise the
 * language row is hidden and only the shared menu is edited
 * (docs/design/17-i18n.md 17.5).
 */
export const MenusPanel = ({ api, locales = [] }: MenusPanelProps) => {
  const t = useT();
  const [location, setLocation] = useState<MenuLocation>('header');
  const [language, setLanguage] = useState<string>(SHARED);

  const languageTabs = [
    { id: SHARED, label: t('menus.shared') },
    ...locales.map((item) => ({ id: item, label: localeLabel(item) })),
  ];
  const selected = locales.includes(language) ? language : SHARED;

  return (
    <div className="design-stack">
      <Tabs
        items={[
          { id: 'header', label: t(LOCATION_LABEL_KEYS.header) },
          { id: 'footer', label: t(LOCATION_LABEL_KEYS.footer) },
        ]}
        value={location}
        onChange={(id) => setLocation(id as MenuLocation)}
      />

      {locales.length > 1 ? (
        <Tabs items={languageTabs} value={selected} onChange={setLanguage} />
      ) : null}

      {selected !== SHARED ? <p className="design-panel__hint">{t('menus.languageHint')}</p> : null}

      <LocationEditor
        api={api}
        location={location}
        locale={selected === SHARED ? undefined : selected}
      />
    </div>
  );
};
