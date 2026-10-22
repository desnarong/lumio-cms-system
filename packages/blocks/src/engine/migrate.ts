import type { BlockNode } from '@lumio/shared';
import { registry, type BlockRegistry } from '../registry.js';
import type { BlockDefinition } from '../types.js';

/**
 * Runs every migration between the block's stored version and the current schema
 * version, e.g. `migrations[1]` upgrades v1 data to v2.
 */
export const migrateBlockProps = <P>(
  definition: BlockDefinition<P>,
  block: BlockNode,
): BlockNode => {
  if (block.version >= definition.version || !definition.migrations) {
    return block;
  }
  let props = block.props;
  for (let version = block.version; version < definition.version; version += 1) {
    const migration = definition.migrations[version];
    if (migration) {
      props = migration(props);
    }
  }
  return { ...block, version: definition.version, props };
};

/** Migrates one block and everything nested inside it. Unknown types are left untouched. */
export const migrateBlock = (block: BlockNode, blocks: BlockRegistry = registry): BlockNode => {
  const definition = blocks.get(block.type);
  const migrated = definition ? migrateBlockProps(definition, block) : block;
  return { ...migrated, children: upgradeBlockTree(migrated.children, blocks) };
};

export const upgradeBlockTree = (
  tree: BlockNode[],
  blocks: BlockRegistry = registry,
): BlockNode[] => tree.map((block) => migrateBlock(block, blocks));
