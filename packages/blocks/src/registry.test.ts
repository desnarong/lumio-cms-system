import { describe, expect, it } from 'vitest';
import { BUILTIN_BLOCK_TYPES } from '@lumio/shared';
import { headingBlock } from './blocks/heading/index.js';
import { builtinBlocks, registerBuiltinBlocks } from './builtins.js';
import { BlockRegistry, registry } from './registry.js';

describe('BlockRegistry', () => {
  it('registers and lists blocks', () => {
    const blocks = new BlockRegistry();
    blocks.register(headingBlock);
    expect(blocks.has('heading')).toBe(true);
    expect(blocks.listByCategory('text')).toHaveLength(1);
  });

  it('rejects duplicate block types', () => {
    const blocks = new BlockRegistry();
    blocks.register(headingBlock);
    expect(() => blocks.register(headingBlock)).toThrow(/already registered/);
  });

  it('ships the starter blocks as builtins', () => {
    expect(builtinBlocks.map((block) => block.type)).toEqual([
      'heading',
      'paragraph',
      'image',
      'button',
      'hero',
      'features',
      'products',
      'posts',
      'form',
      'language-switcher',
    ]);
  });

  it('registers builtins exactly once', () => {
    registerBuiltinBlocks();
    registerBuiltinBlocks();
    expect(registry.list()).toHaveLength(builtinBlocks.length);
  });

  it('offers the marketplace exactly the blocks this build renders', () => {
    expect([...BUILTIN_BLOCK_TYPES]).toEqual(builtinBlocks.map((block) => block.type));
  });

  it('keeps every builtin default valid against its schema', () => {
    for (const block of builtinBlocks) {
      expect(() => block.schema.parse(block.defaults)).not.toThrow();
    }
  });

  it('gives every builtin a renderer and an editor panel', () => {
    for (const block of builtinBlocks) {
      expect(block.Block).toBeTypeOf('function');
      expect(block.Panel).toBeTypeOf('function');
      expect(block.defaults.version).toBe(block.version);
    }
  });

  it('registers and resolves data loaders', () => {
    const blocks = new BlockRegistry();
    const loader = async () => [];
    blocks.registerLoader('latest-posts', loader);
    expect(blocks.hasLoader('latest-posts')).toBe(true);
    expect(blocks.getLoader('latest-posts')).toBe(loader);
    expect(blocks.listLoaders()).toEqual(['latest-posts']);
    expect(() => blocks.registerLoader('latest-posts', loader)).toThrow(/already registered/);
  });
});
