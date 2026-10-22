import { describe, expect, it } from 'vitest';
import { registerBuiltinBlocks } from '../builtins.js';
import { BlockRegistry } from '../registry.js';
import { createBlockNode, filterBlockCatalog, listBlockCatalog } from './catalog.js';

registerBuiltinBlocks();

describe('createBlockNode', () => {
  it('builds a node from the block defaults', () => {
    const node = createBlockNode('hero');
    expect(node.type).toBe('hero');
    expect(node.version).toBe(1);
    expect(node.children).toEqual([]);
    expect(node.props.heading).toBe('กาแฟคั่วสดจากดอย ส่งตรงถึงบ้านคุณ');
  });

  it('gives every new node its own style object', () => {
    const first = createBlockNode('heading');
    const second = createBlockNode('heading');
    expect(first.style).not.toBe(second.style);
    expect(first.style.visibility).not.toBe(second.style.visibility);
    expect(first.id).not.toBe(second.id);
  });

  it('rejects an unknown block type', () => {
    expect(() => createBlockNode('does-not-exist')).toThrow(/not registered/);
  });

  it('works against a custom registry', () => {
    const custom = new BlockRegistry();
    expect(listBlockCatalog(custom)).toEqual([]);
  });
});

describe('listBlockCatalog', () => {
  it('groups the builtin blocks with Thai category labels', () => {
    const catalog = listBlockCatalog();
    const categories = catalog.map((group) => group.category);
    expect(categories).toContain('text');
    expect(categories).toContain('landing');

    const text = catalog.find((group) => group.category === 'text');
    expect(text?.label).toBe('ข้อความ');
    expect(text?.blocks.map((entry) => entry.type)).toEqual(
      expect.arrayContaining(['heading', 'paragraph']),
    );
  });
});

describe('listBlockCatalog in English', () => {
  it('translates block names and category headings, keeping Thai searchable', () => {
    const catalog = listBlockCatalog(undefined, 'en');
    const landing = catalog.find((group) => group.category === 'landing');
    const hero = landing?.blocks.find((block) => block.type === 'hero');

    expect(landing?.label).toBe('Landing');
    expect(hero?.label).toBe('Hero');
    expect(hero?.labelEn).toBe('Hero');
    expect(catalog.find((group) => group.category === 'text')?.label).toBe('Text');
  });
});

describe('filterBlockCatalog', () => {
  it('returns every group for an empty query', () => {
    expect(filterBlockCatalog(listBlockCatalog(), '  ')).toHaveLength(listBlockCatalog().length);
  });

  it('matches a Thai label', () => {
    const groups = filterBlockCatalog(listBlockCatalog(), 'หัวข้อ');
    expect(groups.flatMap((group) => group.blocks).map((block) => block.type)).toContain('heading');
  });

  it('matches a block type', () => {
    const groups = filterBlockCatalog(listBlockCatalog(), 'hero');
    expect(groups).toHaveLength(1);
    expect(groups[0]?.category).toBe('landing');
  });

  it('returns nothing when nothing matches', () => {
    expect(filterBlockCatalog(listBlockCatalog(), 'zzzz')).toEqual([]);
  });

  it('finds a block by its English name while the menu is Thai', () => {
    const groups = filterBlockCatalog(listBlockCatalog(), 'contact form');
    expect(groups.flatMap((group) => group.blocks).map((block) => block.type)).toContain('form');
  });

  it('finds a block by its Thai name while the menu is English', () => {
    const groups = filterBlockCatalog(listBlockCatalog(undefined, 'en'), 'หัวข้อ');
    expect(groups.flatMap((group) => group.blocks).map((block) => block.type)).toContain('heading');
  });
});
