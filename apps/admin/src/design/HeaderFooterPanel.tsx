import { useEffect, useState, type ReactNode } from 'react';
import {
  createBlockNode,
  duplicateBlockById,
  findBlockIndexPath,
  insertBlockAt,
  listBlockCatalog,
  moveBlock,
  registry,
  removeBlockById,
  setBlockPath,
  setBlockVisibility,
  writeBlockAt,
} from '@lumio/blocks';
import type {
  BlockEditorMode,
  BlockNode,
  BlockTree,
  GlobalBlockKind,
  SiteChrome,
} from '@lumio/shared';
import {
  Icon,
  Button,
  EmptyState,
  ImagePicker,
  Select,
  Skeleton,
  Tabs,
  TextField,
  useT,
  useToast,
  useUiLocale,
  type MessageKey,
  type UiLocale,
} from '@lumio/ui';
import { cn } from '@lumio/ui/cn';
import { useMediaPicker } from '@lumio/blocks';
import { BlockInspector } from '../editor/BlockInspector.js';
import type { DesignApi } from './api.js';
import { useGlobalBlocks } from './hooks.js';

const KIND_LABEL_KEYS: Record<GlobalBlockKind, MessageKey> = {
  header: 'headerFooter.header',
  footer: 'headerFooter.footer',
};

const catalogOptions = (locale: UiLocale) =>
  listBlockCatalog(undefined, locale).flatMap((group) =>
    group.blocks.map((block) => ({
      value: block.type,
      label: `${group.label} · ${block.label}`,
    })),
  );

const labelOf = (block: BlockNode, locale: UiLocale): string => {
  const definition = registry.get(block.type);
  if (!definition) return block.type;
  return locale === 'en' ? (definition.labelEn ?? definition.label) : definition.label;
};

interface BlocksEditorProps {
  blocks: BlockTree;
  onChange: (blocks: BlockTree) => void;
}

const BlocksEditor = ({ blocks, onChange }: BlocksEditorProps) => {
  const t = useT();
  const locale = useUiLocale();
  const catalogOptionsList = catalogOptions(locale);
  const [selectedId, setSelectedId] = useState<string | null>(blocks[0]?.id ?? null);
  const [panelMode, setPanelMode] = useState<BlockEditorMode>('simple');
  const [addType, setAddType] = useState(catalogOptionsList[0]?.value ?? 'heading');

  const selected = blocks.find((block) => block.id === selectedId) ?? null;

  const addBlock = (): void => {
    const node = createBlockNode(addType);
    onChange(insertBlockAt(blocks, [blocks.length], node));
    setSelectedId(node.id);
  };

  const move = (id: string, delta: number): void => {
    const path = findBlockIndexPath(blocks, id);
    if (!path) return;
    const target = path[path.length - 1]! + delta;
    if (target < 0 || target >= blocks.length) return;
    onChange(moveBlock(blocks, path, [...path.slice(0, -1), target]));
  };

  return (
    <div className="blocks-editor">
      <div className="blocks-editor__list">
        {blocks.length === 0 ? (
          <p className="blocks-editor__empty">{t('headerFooter.empty')}</p>
        ) : (
          <ul className="blocks-editor__items">
            {blocks.map((block, index) => (
              <li key={block.id}>
                <button
                  type="button"
                  className={cn('blocks-editor__item', block.id === selectedId && 'is-selected')}
                  aria-pressed={block.id === selectedId}
                  onClick={() => setSelectedId(block.id)}
                >
                  <span className="blocks-editor__label">{labelOf(block, locale)}</span>
                  <span className="blocks-editor__hint">
                    {t('headerFooter.position', { index: index + 1 })}
                  </span>
                </button>
                <div className="blocks-editor__tools">
                  <button
                    type="button"
                    className="blocks-editor__tool"
                    aria-label={t('headerFooter.moveUp', { name: labelOf(block, locale) })}
                    onClick={() => move(block.id, -1)}
                  >
                    <Icon name="arrow-up" size={16} />
                  </button>
                  <button
                    type="button"
                    className="blocks-editor__tool"
                    aria-label={t('headerFooter.moveDown', { name: labelOf(block, locale) })}
                    onClick={() => move(block.id, 1)}
                  >
                    <Icon name="arrow-down" size={16} />
                  </button>
                  <button
                    type="button"
                    className="blocks-editor__tool"
                    aria-label={t('headerFooter.duplicate', { name: labelOf(block, locale) })}
                    onClick={() => onChange(duplicateBlockById(blocks, block.id))}
                  >
                    <Icon name="copy" size={16} />
                  </button>
                  <button
                    type="button"
                    className="blocks-editor__tool"
                    aria-label={
                      block.style.visibility.desktop === false
                        ? t('headerFooter.show', { name: labelOf(block, locale) })
                        : t('headerFooter.hide', { name: labelOf(block, locale) })
                    }
                    aria-pressed={block.style.visibility.desktop === false}
                    onClick={() => {
                      const visible = block.style.visibility.desktop !== false;
                      onChange(setBlockVisibility(blocks, block.id, 'desktop', !visible));
                    }}
                  >
                    <Icon
                      name={block.style.visibility.desktop === false ? 'eye-off' : 'eye'}
                      size={16}
                    />
                  </button>
                  <button
                    type="button"
                    className="blocks-editor__tool"
                    aria-label={t('headerFooter.remove', { name: labelOf(block, locale) })}
                    onClick={() => {
                      onChange(removeBlockById(blocks, block.id));
                      if (block.id === selectedId) setSelectedId(null);
                    }}
                  >
                    <Icon name="trash" size={16} />
                  </button>
                </div>
              </li>
            ))}
          </ul>
        )}

        <div className="blocks-editor__add">
          <Select
            label={t('headerFooter.addLabel')}
            options={catalogOptionsList}
            value={addType}
            onChange={(event) => setAddType(event.target.value)}
          />
          <Button variant="secondary" onClick={addBlock}>
            {t('headerFooter.add')}
          </Button>
        </div>
      </div>

      <div className="blocks-editor__inspector">
        <BlockInspector
          block={selected}
          device="desktop"
          panelMode={panelMode}
          onPanelModeChange={setPanelMode}
          onChange={(path, value) => {
            if (!selected) return;
            const indexPath = findBlockIndexPath(blocks, selected.id);
            if (!indexPath) return;
            onChange(writeBlockAt(blocks, indexPath, setBlockPath(selected, path, value)));
          }}
        />
      </div>
    </div>
  );
};

const HEADER_HEIGHT_MAX = 200;
const LOGO_HEIGHT_MAX = 160;

/** Size controls that sit above the header blocks (docs/design/08). */
const HeaderChrome = ({ api }: { api: DesignApi }) => {
  const t = useT();
  const toast = useToast();
  const [height, setHeight] = useState(0);
  const [logoHeight, setLogoHeight] = useState(0);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    let active = true;
    api
      .getChrome()
      .then((chrome) => {
        if (active) {
          setHeight(chrome.headerHeight);
          setLogoHeight(chrome.logoHeight);
        }
      })
      .catch(() => undefined)
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, [api]);

  if (loading) return <Skeleton shape="block" height={96} />;

  const save = async (): Promise<void> => {
    setSaving(true);
    try {
      const chrome = await api.updateChrome({ headerHeight: height, logoHeight });
      setHeight(chrome.headerHeight);
      setLogoHeight(chrome.logoHeight);
      toast.push({ tone: 'success', title: t('design.saved') });
    } catch (error) {
      toast.push({
        tone: 'danger',
        title: error instanceof Error ? error.message : t('common.retry'),
      });
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="design-panel">
      <TextField
        label={t('headerFooter.height')}
        hint={t('headerFooter.heightHint')}
        type="number"
        min={0}
        max={HEADER_HEIGHT_MAX}
        value={String(height)}
        onChange={(event) =>
          setHeight(
            Math.min(HEADER_HEIGHT_MAX, Math.max(0, Math.round(Number(event.target.value) || 0))),
          )
        }
      />
      <TextField
        label={t('headerFooter.logoHeight')}
        hint={t('headerFooter.logoHeightHint')}
        type="number"
        min={0}
        max={LOGO_HEIGHT_MAX}
        value={String(logoHeight)}
        onChange={(event) =>
          setLogoHeight(
            Math.min(LOGO_HEIGHT_MAX, Math.max(0, Math.round(Number(event.target.value) || 0))),
          )
        }
      />
      <div className="design-actions">
        <Button variant="primary" disabled={saving} onClick={() => void save()}>
          {saving ? t('design.savingDots') : t('headerFooter.saveHeight')}
        </Button>
      </div>
    </div>
  );
};


const FOOTER_BACKGROUNDS = [
  { value: 'none', label: 'ไม่มีพื้นหลัง' },
  { value: 'surface', label: 'พื้นผิว' },
  { value: 'muted', label: 'เทาอ่อน' },
  { value: 'brand', label: 'สีแบรนด์' },
] as const;

type ChromeLink = { label: string; href: string };

/** Footer band, social links and legal links, all stored in the site chrome. */
const FooterChrome = ({ api }: { api: DesignApi }) => {
  const t = useT();
  const toast = useToast();
  const mediaPicker = useMediaPicker();
  const [chrome, setChrome] = useState<SiteChrome | null>(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    let active = true;
    api
      .getChrome()
      .then((value) => {
        if (active) setChrome(value);
      })
      .catch(() => undefined);
    return () => {
      active = false;
    };
  }, [api]);

  if (!chrome) return <Skeleton shape="block" height={160} />;

  const patch = (value: Partial<SiteChrome>): void => setChrome({ ...chrome, ...value });

  const updateLink = (
    key: 'socialLinks' | 'legalLinks',
    index: number,
    value: Partial<ChromeLink>,
  ): void =>
    patch({
      [key]: chrome[key].map((item, itemIndex) =>
        itemIndex === index ? { ...item, ...value } : item,
      ),
    } as Partial<SiteChrome>);

  const addLink = (key: 'socialLinks' | 'legalLinks'): void =>
    patch({ [key]: [...chrome[key], { label: 'Facebook', href: '' }] } as Partial<SiteChrome>);

  const removeLink = (key: 'socialLinks' | 'legalLinks', index: number): void =>
    patch({ [key]: chrome[key].filter((_, itemIndex) => itemIndex !== index) } as Partial<SiteChrome>);

  const save = async (): Promise<void> => {
    setSaving(true);
    try {
      const saved = await api.updateChrome(chrome);
      setChrome(saved);
      toast.push({ tone: 'success', title: t('design.saved') });
    } catch (error) {
      toast.push({
        tone: 'danger',
        title: error instanceof Error ? error.message : t('common.retry'),
      });
    } finally {
      setSaving(false);
    }
  };

  const linkFields = (key: 'socialLinks' | 'legalLinks', addLabel: string): ReactNode => (
    <>
      {chrome[key].map((item, index) => (
        <div className="hero-float-editor" key={index}>
          <TextField
            label={t('headerFooter.linkLabel')}
            value={item.label}
            onChange={(event) => updateLink(key, index, { label: event.target.value })}
          />
          <TextField
            label={t('headerFooter.linkHref')}
            value={item.href}
            onChange={(event) => updateLink(key, index, { href: event.target.value })}
          />
          <Button variant="secondary" onClick={() => removeLink(key, index)}>
            {t('headerFooter.removeLink')}
          </Button>
        </div>
      ))}
      <Button variant="secondary" onClick={() => addLink(key)}>
        {addLabel}
      </Button>
    </>
  );

  return (
    <div className="design-panel">
      <Select
        label={t('headerFooter.footerBackground')}
        value={chrome.footerBackground}
        options={[...FOOTER_BACKGROUNDS]}
        onChange={(event) =>
          patch({ footerBackground: event.target.value as SiteChrome['footerBackground'] })
        }
      />
      <ImagePicker
        label={t('headerFooter.footerImage')}
        value={chrome.footerBackgroundImage || null}
        alt=""
        disabled={!mediaPicker}
        hint={mediaPicker ? t('headerFooter.footerImageHint') : t('headerFooter.noMedia')}
        onPick={() => {
          void mediaPicker
            ?.pick({ aspect: 'wide' })
            .then((picked) => {
              if (picked) patch({ footerBackgroundImage: picked.url });
            })
            .catch(() => undefined);
        }}
        onChange={(url) => patch({ footerBackgroundImage: url ?? '' })}
      />
      <TextField
        label={t('headerFooter.footerOverlay')}
        type="number"
        min={0}
        max={100}
        value={String(chrome.footerOverlay)}
        onChange={(event) =>
          patch({
            footerOverlay: Math.min(100, Math.max(0, Math.round(Number(event.target.value) || 0))),
          })
        }
      />
      <TextField
        label={t('headerFooter.copyright')}
        hint={t('headerFooter.copyrightHint')}
        value={chrome.copyright}
        onChange={(event) => patch({ copyright: event.target.value })}
      />
      <p className="lumio-panel-section__title">{t('headerFooter.socialTitle')}</p>
      {linkFields('socialLinks', t('headerFooter.addSocial'))}
      <p className="lumio-panel-section__title">{t('headerFooter.legalTitle')}</p>
      {linkFields('legalLinks', t('headerFooter.addLegal'))}
      <div className="design-actions">
        <Button variant="primary" disabled={saving} onClick={() => void save()}>
          {saving ? t('design.savingDots') : t('headerFooter.saveFooter')}
        </Button>
      </div>
    </div>
  );
};

const KindEditor = ({ api, kind }: { api: DesignApi; kind: GlobalBlockKind }) => {
  const t = useT();
  const toast = useToast();
  const globals = useGlobalBlocks(api, kind);

  const save = async (): Promise<void> => {
    if (await globals.save()) toast.push({ tone: 'success', title: t('design.saved') });
  };

  if (globals.loading) {
    return <Skeleton shape="block" height={260} />;
  }

  if (globals.error && globals.blocks.length === 0) {
    return (
      <EmptyState
        tone="error"
        title={t('headerFooter.loadError')}
        description={globals.error}
        action={
          <Button variant="secondary" onClick={() => void globals.reload()}>
            {t('common.retry')}
          </Button>
        }
      />
    );
  }

  return (
    <div className="design-panel">
      <p className="design-hint">{t('headerFooter.hint')}</p>
      <BlocksEditor blocks={globals.blocks} onChange={globals.setBlocks} />
      <div className="design-actions">
        <Button variant="primary" disabled={globals.saving} onClick={() => void save()}>
          {globals.saving
            ? t('design.savingDots')
            : kind === 'header'
              ? t('headerFooter.saveHeader')
              : t('headerFooter.saveFooter')}
        </Button>
        {globals.error ? (
          <span className="design-error" role="alert">
            {globals.error}
          </span>
        ) : null}
      </div>
    </div>
  );
};

/** Header/footer tab: global blocks shown on every page. */
export const HeaderFooterPanel = ({ api }: { api: DesignApi }) => {
  const t = useT();
  const [kind, setKind] = useState<GlobalBlockKind>('header');

  return (
    <div className="design-stack">
      <Tabs
        items={[
          { id: 'header', label: t(KIND_LABEL_KEYS.header) },
          { id: 'footer', label: t(KIND_LABEL_KEYS.footer) },
        ]}
        value={kind}
        onChange={(id) => setKind(id as GlobalBlockKind)}
      />
      {kind === 'header' ? <HeaderChrome api={api} /> : <FooterChrome api={api} />}
      <KindEditor api={api} kind={kind} />
    </div>
  );
};
