import type { BlockNode, BlockTree, TextRun } from '@lumio/shared';

/** Index path to a block inside the tree, e.g. `[2, 0]` = first child of the third root block. */
export type BlockIndexPath = readonly number[];

export type BlockDevice = 'mobile' | 'tablet' | 'desktop';

/** Stable id for a freshly added block; falls back when `crypto.randomUUID` is missing. */
export const createBlockId = (): string => {
  const cryptoRef = (globalThis as { crypto?: { randomUUID?: () => string } }).crypto;
  if (cryptoRef?.randomUUID) {
    return cryptoRef.randomUUID();
  }
  return `b-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;
};

export const walkBlocks = (
  blocks: BlockTree,
  visit: (block: BlockNode, path: BlockIndexPath) => void,
  parent: BlockIndexPath = [],
): void => {
  blocks.forEach((block, index) => {
    const path = [...parent, index];
    visit(block, path);
    walkBlocks(block.children, visit, path);
  });
};

export const countBlocks = (blocks: BlockTree): number => {
  let total = 0;
  walkBlocks(blocks, () => {
    total += 1;
  });
  return total;
};

export const findBlockById = (blocks: BlockTree, id: string): BlockNode | null => {
  let found: BlockNode | null = null;
  walkBlocks(blocks, (block) => {
    if (found === null && block.id === id) found = block;
  });
  return found;
};

export const findBlockIndexPath = (blocks: BlockTree, id: string): BlockIndexPath | null => {
  let found: BlockIndexPath | null = null;
  walkBlocks(blocks, (block, path) => {
    if (found === null && block.id === id) found = path;
  });
  return found;
};

/** Reads the block at an index path, or `null` when the path does not exist. */
export const readBlockAt = (blocks: BlockTree, path: BlockIndexPath): BlockNode | null => {
  let current: BlockNode | null = null;
  let list: BlockTree = blocks;
  for (const index of path) {
    const block = list[index];
    if (!block) return null;
    current = block;
    list = block.children;
  }
  return current;
};

/** Replaces the child list reached by `path`, copying only the blocks on the way down. */
const withChildren = (blocks: BlockTree, path: BlockIndexPath, next: BlockTree): BlockTree => {
  const [head, ...rest] = path;
  if (head === undefined) return next;
  const block = blocks[head];
  if (!block) return blocks;
  const copy = [...blocks];
  copy[head] = { ...block, children: withChildren(block.children, rest, next) };
  return copy;
};

const mutateList = (
  blocks: BlockTree,
  listPath: BlockIndexPath,
  update: (list: BlockTree) => BlockTree,
): BlockTree => {
  if (listPath.length === 0) return update(blocks);
  const container = readBlockAt(blocks, listPath);
  if (!container) return blocks;
  return withChildren(blocks, listPath, update(container.children));
};

const splitPath = (path: BlockIndexPath): { listPath: BlockIndexPath; index: number } | null => {
  if (path.length === 0) return null;
  const index = path[path.length - 1];
  if (index === undefined) return null;
  return { listPath: path.slice(0, -1), index };
};

export const writeBlockAt = (
  blocks: BlockTree,
  path: BlockIndexPath,
  block: BlockNode,
): BlockTree => {
  const split = splitPath(path);
  if (!split) return blocks;
  return mutateList(blocks, split.listPath, (list) => {
    if (!list[split.index]) return list;
    const next = [...list];
    next[split.index] = block;
    return next;
  });
};

export const insertBlockAt = (
  blocks: BlockTree,
  path: BlockIndexPath,
  block: BlockNode,
): BlockTree => {
  const split = splitPath(path);
  if (!split) return blocks;
  return mutateList(blocks, split.listPath, (list) => {
    const next = [...list];
    next.splice(Math.max(0, Math.min(split.index, next.length)), 0, block);
    return next;
  });
};

export const removeBlockAt = (blocks: BlockTree, path: BlockIndexPath): BlockTree => {
  const split = splitPath(path);
  if (!split) return blocks;
  return mutateList(blocks, split.listPath, (list) =>
    list.filter((_block, position) => position !== split.index),
  );
};

/**
 * Inserts several blocks at once, keeping their order. Saved sections
 * (`section_templates` rows) arrive as a tree, not a single block.
 */
export const insertBlocksAt = (
  blocks: BlockTree,
  path: BlockIndexPath,
  incoming: BlockTree,
): BlockTree => {
  if (incoming.length === 0) return blocks;
  const split = splitPath(path);
  if (!split) return blocks;
  return mutateList(blocks, split.listPath, (list) => {
    const next = [...list];
    next.splice(Math.max(0, Math.min(split.index, next.length)), 0, ...incoming);
    return next;
  });
};

export const removeBlockById = (blocks: BlockTree, id: string): BlockTree => {
  const path = findBlockIndexPath(blocks, id);
  return path ? removeBlockAt(blocks, path) : blocks;
};

const sameParent = (from: BlockIndexPath, to: BlockIndexPath): boolean => {
  const parent = from.slice(0, -1);
  return parent.length === to.length - 1 && parent.every((index, position) => index === to[position]);
};

/**
 * Reorders a block inside its own parent list. Moving a block into another block
 * is a separate feature, so a drop across parents leaves the tree untouched.
 */
export const moveBlock = (
  blocks: BlockTree,
  from: BlockIndexPath,
  to: BlockIndexPath,
): BlockTree => {
  if (!sameParent(from, to)) return blocks;
  const split = splitPath(from);
  const targetIndex = to[to.length - 1];
  if (!split || targetIndex === undefined || split.index === targetIndex) return blocks;

  return mutateList(blocks, split.listPath, (list) => {
    const block = list[split.index];
    if (!block) return list;
    const next = [...list];
    next.splice(split.index, 1);
    const target = targetIndex > split.index ? targetIndex - 1 : targetIndex;
    next.splice(Math.max(0, Math.min(target, next.length)), 0, block);
    return next;
  });
};

export const cloneBlockWithNewIds = (block: BlockNode): BlockNode => ({
  ...block,
  id: createBlockId(),
  props: { ...block.props },
  style: { ...block.style, visibility: { ...block.style.visibility } },
  children: block.children.map(cloneBlockWithNewIds),
});

/** Copies a whole tree (a saved section) with fresh ids, so it can be inserted twice. */
export const cloneTreeWithNewIds = (blocks: BlockTree): BlockTree =>
  blocks.map(cloneBlockWithNewIds);

export const duplicateBlockById = (blocks: BlockTree, id: string): BlockTree => {
  const path = findBlockIndexPath(blocks, id);
  if (!path) return blocks;
  const block = readBlockAt(blocks, path);
  if (!block) return blocks;
  const insertPath = [...path.slice(0, -1), (path[path.length - 1] as number) + 1];
  return insertBlockAt(blocks, insertPath, cloneBlockWithNewIds(block));
};

export const updateBlockById = (
  blocks: BlockTree,
  id: string,
  update: (block: BlockNode) => BlockNode,
): BlockTree =>
  blocks.map((block) =>
    block.id === id ? update(block) : { ...block, children: updateBlockById(block.children, id, update) },
  );


export const setBlockTextStyles = (
  blocks: BlockTree,
  id: string,
  path: string,
  runs: readonly TextRun[],
): BlockTree =>
  updateBlockById(blocks, id, (block) => {
    const textStyles = { ...(block.textStyles ?? {}) };
    if (runs.length === 0) delete textStyles[path];
    else textStyles[path] = [...runs];
    return { ...block, textStyles };
  });

export const setBlockVisibility = (
  blocks: BlockTree,
  id: string,
  device: BlockDevice,
  visible: boolean,
): BlockTree =>
  updateBlockById(blocks, id, (block) => ({
    ...block,
    style: { ...block.style, visibility: { ...block.style.visibility, [device]: visible } },
  }));
