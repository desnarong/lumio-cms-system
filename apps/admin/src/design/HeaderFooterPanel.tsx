import { useState } from 'react';
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
import type { BlockEditorMode, BlockNode, BlockTree, GlobalBlockKind } from '@lumio/shared';
import {
  Icon,
  Button,
  EmptyState,
  Select,
  Skeleton,
  Tabs,
  useT,
  useUiLocale,
  type MessageKey,
  type UiLocale,
} from '@lumio/ui';
import { cn } from '@lumio/ui/cn';
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
          onDuplicate={() => {
            if (!selected) return;
            onChange(duplicateBlockById(blocks, selected.id));
          }}
          onToggleVisibility={() => {
            if (!selected) return;
            const visible = selected.style.visibility.desktop !== false;
            onChange(setBlockVisibility(blocks, selected.id, 'desktop', !visible));
          }}
          onRemove={() => {
            if (!selected) return;
            onChange(removeBlockById(blocks, selected.id));
            setSelectedId(null);
          }}
        />
      </div>
    </div>
  );
};

const KindEditor = ({ api, kind }: { api: DesignApi; kind: GlobalBlockKind }) => {
  const t = useT();
  const globals = useGlobalBlocks(api, kind);

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
        <Button variant="primary" disabled={globals.saving} onClick={() => void globals.save()}>
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
      <KindEditor api={api} kind={kind} />
    </div>
  );
};
