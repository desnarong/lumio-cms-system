import { describe, expect, it } from 'vitest';
import { blockNodeSchema, blockTreeSchema } from './blocks.js';

describe('block schema', () => {
  it('applies style defaults', () => {
    const parsed = blockNodeSchema.parse({ id: 'blk_1', type: 'hero' });
    expect(parsed.version).toBe(1);
    expect(parsed.style.paddingY).toBe('md');
    expect(parsed.children).toEqual([]);
  });

  it('parses nested children', () => {
    const tree = blockTreeSchema.parse([
      { id: 'blk_1', type: 'section', children: [{ id: 'blk_2', type: 'heading' }] },
    ]);
    expect(tree[0]?.children[0]?.type).toBe('heading');
  });

  it('rejects a block without an id', () => {
    expect(() => blockNodeSchema.parse({ type: 'hero' })).toThrow();
  });
});
