import { describe, expect, it } from 'vitest';
import { defaultBlockStyle, type BlockNode, type BlockTree } from '@lumio/shared';
import {
  cloneBlockWithNewIds,
  cloneTreeWithNewIds,
  countBlocks,
  createBlockId,
  duplicateBlockById,
  findBlockById,
  findBlockIndexPath,
  insertBlockAt,
  insertBlocksAt,
  moveBlock,
  readBlockAt,
  removeBlockAt,
  removeBlockById,
  setBlockVisibility,
  updateBlockById,
  writeBlockAt,
} from './tree.js';

const block = (id: string, children: BlockNode[] = []): BlockNode => ({
  id,
  type: 'heading',
  version: 1,
  props: { text: id, level: 'h2', align: 'left' },
  style: { ...defaultBlockStyle, visibility: { ...defaultBlockStyle.visibility } },
  children,
});

const tree = (): BlockTree => [block('a'), block('b', [block('b1')]), block('c')];

describe('block tree reads', () => {
  it('counts nested blocks', () => {
    expect(countBlocks(tree())).toBe(4);
  });

  it('finds a block and its index path', () => {
    expect(findBlockById(tree(), 'b1')?.id).toBe('b1');
    expect(findBlockIndexPath(tree(), 'b1')).toEqual([1, 0]);
    expect(findBlockById(tree(), 'nope')).toBeNull();
    expect(findBlockIndexPath(tree(), 'nope')).toBeNull();
  });

  it('reads a block by index path', () => {
    expect(readBlockAt(tree(), [1, 0])?.id).toBe('b1');
    expect(readBlockAt(tree(), [9])).toBeNull();
    expect(readBlockAt(tree(), [1, 9])).toBeNull();
  });
});

describe('block tree writes', () => {
  it('inserts at a top level index', () => {
    const next = insertBlockAt(tree(), [1], block('new'));
    expect(next.map((item) => item.id)).toEqual(['a', 'new', 'b', 'c']);
  });

  it('inserts into a nested list', () => {
    const next = insertBlockAt(tree(), [1, 0], block('new'));
    expect(next[1]?.children.map((item) => item.id)).toEqual(['new', 'b1']);
  });

  it('removes a block without touching its siblings', () => {
    const next = removeBlockAt(tree(), [1]);
    expect(next.map((item) => item.id)).toEqual(['a', 'c']);
  });

  it('inserts a whole saved section at once, keeping its order', () => {
    const saved = [block('s1'), block('s2', [block('s2a')])];
    const next = insertBlocksAt(tree(), [2], saved);

    expect(next.map((item) => item.id)).toEqual(['a', 'b', 's1', 's2', 'c']);
    expect(next[3]?.children.map((item) => item.id)).toEqual(['s2a']);
  });

  it('copies a saved section with fresh ids before inserting it twice', () => {
    const saved = [block('s1', [block('s2')])];
    const inserted = insertBlocksAt(
      insertBlocksAt(tree(), [0], cloneTreeWithNewIds(saved)),
      [0],
      cloneTreeWithNewIds(saved),
    );

    const ids = inserted.slice(0, 2).flatMap((item) => [item.id, ...item.children.map((child) => child.id)]);
    expect(new Set(ids).size).toBe(4);
    expect(inserted[0]?.children[0]?.type).toBe('heading');
  });

  it('leaves the tree alone when the saved section or the path is empty', () => {
    const current = tree();
    expect(insertBlocksAt(current, [1], [])).toBe(current);
    expect(insertBlocksAt(current, [], [block('s1')])).toBe(current);
  });

  it('removes a nested block by id', () => {
    const next = removeBlockById(tree(), 'b1');
    expect(next[1]?.children).toEqual([]);
    expect(removeBlockById(next, 'missing')).toBe(next);
  });

  it('replaces a block in place', () => {
    const next = writeBlockAt(tree(), [0], block('a2'));
    expect(next[0]?.id).toBe('a2');
    const input = tree();
    expect(writeBlockAt(input, [9], block('x'))).toBe(input);
  });

  it('updates a nested block through a callback', () => {
    const next = updateBlockById(tree(), 'b1', (item) => ({
      ...item,
      props: { ...item.props, text: 'แก้แล้ว' },
    }));
    expect(readBlockAt(next, [1, 0])?.props.text).toBe('แก้แล้ว');
  });
});

describe('block tree ordering', () => {
  it('moves a block down inside the same list', () => {
    const next = moveBlock(tree(), [0], [2]);
    expect(next.map((item) => item.id)).toEqual(['b', 'a', 'c']);
  });

  it('moves a block to the end of the list', () => {
    const next = moveBlock(tree(), [0], [3]);
    expect(next.map((item) => item.id)).toEqual(['b', 'c', 'a']);
  });

  it('moves a nested block up', () => {
    const start = insertBlockAt(tree(), [1, 0], block('b0'));
    const next = moveBlock(start, [1, 1], [1, 0]);
    expect(next[1]?.children.map((item) => item.id)).toEqual(['b1', 'b0']);
  });

  it('ignores a drop into a different parent', () => {
    const input = tree();
    expect(moveBlock(input, [0], [1, 0])).toBe(input);
  });

  it('ignores a drop on the same index', () => {
    const input = tree();
    expect(moveBlock(input, [1], [1])).toBe(input);
  });
});

describe('block tree duplication', () => {
  it('clones a block with fresh ids all the way down', () => {
    const clone = cloneBlockWithNewIds(block('a', [block('a1')]));
    expect(clone.id).not.toBe('a');
    expect(clone.children[0]?.id).not.toBe('a1');
    expect(clone.children).toHaveLength(1);
  });

  it('inserts the copy right after the original', () => {
    const next = duplicateBlockById(tree(), 'b');
    expect(next.map((item) => item.id)[1]).toBe('b');
    expect(next).toHaveLength(4);
    expect(next[2]?.id).not.toBe('b');
    const input = tree();
    expect(duplicateBlockById(input, 'missing')).toBe(input);
  });
});

describe('block visibility', () => {
  it('hides a block on one device only', () => {
    const next = setBlockVisibility(tree(), 'b1', 'mobile', false);
    const target = readBlockAt(next, [1, 0]);
    expect(target?.style.visibility).toEqual({ mobile: false, tablet: true, desktop: true });
  });
});

describe('createBlockId', () => {
  it('returns a unique id', () => {
    expect(createBlockId()).not.toBe(createBlockId());
  });
});
