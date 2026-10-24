import { useId, useState, type ReactNode } from 'react';
import {
  MENU_ALIGNS,
  localeLabel,
  type MenuAlign,
  type MenuItem,
  type MenuLocation,
} from '@lumio/shared';
import {
  Button,
  EmptyState,
  Icon,
  IconButton,
  Select,
  Skeleton,
  Tabs,
  TextField,
  Tooltip,
  useT,
  useToast,
  type MessageKey,
} from '@lumio/ui';
import type { DesignApi } from './api.js';
import { useMenu } from './hooks.js';

const LOCATION_LABEL_KEYS: Record<MenuLocation, MessageKey> = {
  header: 'menus.header',
  footer: 'menus.footer',
};

const ALIGN_LABEL_KEYS: Record<MenuAlign, MessageKey> = {
  left: 'menus.alignLeft',
  center: 'menus.alignCenter',
  right: 'menus.alignRight',
};

const emptyItem = (): MenuItem => ({ label: '', href: '', children: [] });

const replaceAt = (items: MenuItem[], index: number, next: MenuItem): MenuItem[] =>
  items.map((item, position) => (position === index ? next : item));

const removeAt = (items: MenuItem[], index: number): MenuItem[] =>
  items.filter((_, position) => position !== index);

const moveAt = (items: MenuItem[], from: number, to: number): MenuItem[] => {
  if (to < 0 || to >= items.length) return items;
  const next = [...items];
  const [item] = next.splice(from, 1);
  if (!item) return items;
  next.splice(to, 0, item);
  return next;
};

interface MenuNodeProps {
  item: MenuItem;
  depth: number;
  onChange: (next: MenuItem) => void;
  onRemove: () => void;
  onAddChild?: () => void;
  onMoveUp?: () => void;
  onMoveDown?: () => void;
  canMoveUp?: boolean;
  canMoveDown?: boolean;
  children?: ReactNode;
}

const FieldHelp = ({ text, id }: { text: string; id: string }) => (
  <Tooltip content={<span id={id}>{text}</span>}>
    <span className="menu-node__help" role="img" aria-label={text} tabIndex={0}>
      <Icon name="info" size={14} />
    </span>
  </Tooltip>
);

const MenuNode = ({
  item,
  depth,
  onChange,
  onRemove,
  onAddChild,
  onMoveUp,
  onMoveDown,
  canMoveUp = false,
  canMoveDown = false,
  children,
}: MenuNodeProps) => {
  const t = useT();
  const itemName = item.label.trim() || t('menus.itemPlaceholder');
  const hrefHintId = `${useId()}-href-hint`;

  return (
    <li className="menu-node">
      <div className="menu-node__row">
        <TextField
          label={depth === 0 ? t('menus.itemLabel') : t('menus.childLabel')}
          value={item.label}
          placeholder={t('menus.itemPlaceholder')}
          onChange={(event) => onChange({ ...item, label: event.target.value })}
        />
        <TextField
          label={
            <span className="menu-node__label">
              {t('menus.hrefLabel')}
              <FieldHelp id={hrefHintId} text={t('menus.hrefHint')} />
            </span>
          }
          aria-describedby={hrefHintId}
          value={item.href ?? ''}
          placeholder="/services"
          onChange={(event) => onChange({ ...item, href: event.target.value })}
        />
        <div className="menu-node__actions">
          {onMoveUp ? (
            <Tooltip content={t('menus.moveUp', { name: itemName })} className="ui-tooltip--end">
              <IconButton
                size="sm"
                aria-label={t('menus.moveUp', { name: itemName })}
                disabled={!canMoveUp}
                onClick={onMoveUp}
              >
                <Icon name="arrow-up" size={16} />
              </IconButton>
            </Tooltip>
          ) : null}
          {onMoveDown ? (
            <Tooltip content={t('menus.moveDown', { name: itemName })} className="ui-tooltip--end">
              <IconButton
                size="sm"
                aria-label={t('menus.moveDown', { name: itemName })}
                disabled={!canMoveDown}
                onClick={onMoveDown}
              >
                <Icon name="arrow-down" size={16} />
              </IconButton>
            </Tooltip>
          ) : null}
          {onAddChild ? (
            <Tooltip content={t('menus.addChild')} className="ui-tooltip--end">
              <IconButton size="sm" aria-label={t('menus.addChild')} onClick={onAddChild}>
                <Icon name="plus" size={16} />
              </IconButton>
            </Tooltip>
          ) : null}
          <Tooltip content={`${t('common.delete')} ${itemName}`} className="ui-tooltip--end">
            <IconButton
              size="sm"
              aria-label={`${t('common.delete')} ${itemName}`}
              onClick={onRemove}
            >
              <Icon name="trash" size={16} />
            </IconButton>
          </Tooltip>
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
        <EmptyState
          title={t('menus.emptyTitle')}
          description={t('menus.emptyDescription')}
          action={
            <Button variant="secondary" onClick={() => onChange([emptyItem()])}>
              {t('menus.add')}
            </Button>
          }
        />
      ) : (
        <ul className="menu-editor__list">
          {items.map((item, index) => (
            <MenuNode
              key={index}
              item={item}
              depth={0}
              onChange={(next) => onChange(replaceAt(items, index, next))}
              onRemove={() => onChange(removeAt(items, index))}
              onMoveUp={() => onChange(moveAt(items, index, index - 1))}
              onMoveDown={() => onChange(moveAt(items, index, index + 1))}
              canMoveUp={index > 0}
              canMoveDown={index < items.length - 1}
              onAddChild={() =>
                onChange(
                  replaceAt(items, index, { ...item, children: [...item.children, emptyItem()] }),
                )
              }
            >
              {item.children.map((child, childIndex) => (
                <MenuNode
                  key={childIndex}
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
                  onMoveUp={() =>
                    onChange(
                      replaceAt(items, index, {
                        ...item,
                        children: moveAt(item.children, childIndex, childIndex - 1),
                      }),
                    )
                  }
                  onMoveDown={() =>
                    onChange(
                      replaceAt(items, index, {
                        ...item,
                        children: moveAt(item.children, childIndex, childIndex + 1),
                      }),
                    )
                  }
                  canMoveUp={childIndex > 0}
                  canMoveDown={childIndex < item.children.length - 1}
                />
              ))}
            </MenuNode>
          ))}
        </ul>
      )}

      {items.length === 0 ? null : (
        <Button variant="secondary" onClick={() => onChange([...items, emptyItem()])}>
          {t('menus.add')}
        </Button>
      )}
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
  const toast = useToast();
  const menu = useMenu(api, location, locale);

  const save = async (): Promise<void> => {
    if (await menu.save()) toast.push({ tone: 'success', title: t('design.saved') });
  };

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
      <Select
        label={t('menus.alignLabel')}
        hint={t('menus.alignHint')}
        value={menu.align}
        options={MENU_ALIGNS.map((align) => ({
          value: align,
          label: t(ALIGN_LABEL_KEYS[align]),
        }))}
        onChange={(event) => menu.setAlign(event.target.value as MenuAlign)}
      />
      <MenuEditor items={menu.items} onChange={menu.setItems} />
      <div className="design-actions">
        <Button variant="primary" disabled={menu.saving} onClick={() => void save()}>
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
