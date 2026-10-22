import type { ApiLocale, BlockNode } from '@lumio/shared';
import { registry, type BlockRegistry } from '../registry.js';
import type { BlockCategory } from '../types.js';
import { createBlockId } from './tree.js';

/**
 * Builds a new block node from a registered definition, so the editor never has
 * to know a block's props shape: it starts from the block's own Thai defaults.
 */
export const createBlockNode = (
  type: string,
  blockRegistry: BlockRegistry = registry,
): BlockNode => {
  const definition = blockRegistry.get(type);
  if (!definition) {
    throw new Error(`Block "${type}" is not registered`);
  }
  return {
    id: createBlockId(),
    type: definition.type,
    version: definition.version,
    props: { ...definition.defaults.props },
    style: {
      ...definition.defaults.style,
      visibility: { ...definition.defaults.style.visibility },
    },
    children: [],
  };
};

/** Labels for the slash menu's category headings, Thai first. */
export const BLOCK_CATEGORY_LABELS: Record<BlockCategory, string> = {
  structure: 'โครงสร้าง',
  text: 'ข้อความ',
  media: 'รูปภาพและสื่อ',
  landing: 'หน้าแรก',
  interactive: 'ปุ่มและฟอร์ม',
  dynamic: 'เนื้อหาอัตโนมัติ',
  advanced: 'ขั้นสูง',
};

export const BLOCK_CATEGORY_LABELS_EN: Record<BlockCategory, string> = {
  structure: 'Structure',
  text: 'Text',
  media: 'Images and media',
  landing: 'Landing',
  interactive: 'Buttons and forms',
  dynamic: 'Dynamic content',
  advanced: 'Advanced',
};

export const blockCategoryLabel = (category: BlockCategory, locale: ApiLocale = 'th'): string =>
  locale === 'en' ? BLOCK_CATEGORY_LABELS_EN[category] : BLOCK_CATEGORY_LABELS[category];

export interface BlockCatalogEntry {
  type: string;
  /** Name in the language the catalog was built for. */
  label: string;
  /** Name in Thai, always present so Thai search works in either language. */
  labelTh: string;
  /** Name in English, so search finds both. */
  labelEn?: string;
  icon?: string;
}

export interface BlockCatalogGroup {
  category: BlockCategory;
  label: string;
  blocks: BlockCatalogEntry[];
}

/**
 * Blocks grouped for the slash menu, in the category order the design uses.
 * Apps can append their own blocks by registering them before the editor mounts.
 */
export const listBlockCatalog = (
  blockRegistry: BlockRegistry = registry,
  locale: ApiLocale = 'th',
): BlockCatalogGroup[] => {
  const groups = new Map<BlockCategory, BlockCatalogEntry[]>();
  for (const definition of blockRegistry.list()) {
    const entry: BlockCatalogEntry = {
      type: definition.type,
      label: locale === 'en' ? (definition.labelEn ?? definition.label) : definition.label,
      labelTh: definition.label,
      ...(definition.labelEn ? { labelEn: definition.labelEn } : {}),
      ...(definition.icon ? { icon: definition.icon } : {}),
    };
    groups.set(definition.category, [...(groups.get(definition.category) ?? []), entry]);
  }
  return [...groups.entries()].map(([category, blocks]) => ({
    category,
    label: blockCategoryLabel(category, locale),
    blocks,
  }));
};

/**
 * Filters the catalog for the slash menu. Matches both language names, the type
 * and the category, so "ปุ่ม" or "button" finds the same block in either UI language.
 */
export const filterBlockCatalog = (
  groups: readonly BlockCatalogGroup[],
  query: string,
): BlockCatalogGroup[] => {
  const needle = query.trim().toLowerCase();
  if (needle.length === 0) return [...groups];

  const categoryMatches = (group: BlockCatalogGroup): boolean =>
    BLOCK_CATEGORY_LABELS[group.category].toLowerCase().includes(needle) ||
    BLOCK_CATEGORY_LABELS_EN[group.category].toLowerCase().includes(needle) ||
    group.label.toLowerCase().includes(needle);

  return groups
    .map((group) => ({
      ...group,
      blocks: group.blocks.filter(
        (block) =>
          block.label.toLowerCase().includes(needle) ||
          block.labelTh.toLowerCase().includes(needle) ||
          (block.labelEn ?? '').toLowerCase().includes(needle) ||
          block.type.toLowerCase().includes(needle) ||
          categoryMatches(group),
      ),
    }))
    .filter((group) => group.blocks.length > 0);
};
