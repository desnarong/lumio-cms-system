import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import type { BlockNode } from '@lumio/shared';
import { registerRenderBlocks, renderBuiltinBlocks } from './builtins.render.js';
import { registry } from './registry.js';
import { BlockTreeRenderer } from './engine/renderer.js';

registerRenderBlocks();

const nodeOf = (type: string): BlockNode => {
  const definition = registry.get(type);
  if (!definition) throw new Error(`missing block ${type}`);
  const data = definition.schema.parse({
    version: definition.defaults.version,
    props: definition.defaults.props,
    style: definition.defaults.style,
  });
  return { id: `blk_${type}`, type, version: data.version, props: data.props, style: data.style, children: [] };
};

describe('render entry', () => {
  it('registers every built-in block for server rendering', () => {
    expect(renderBuiltinBlocks.map((block) => block.type)).toEqual([
      'heading',
      'paragraph',
      'image',
      'button',
      'hero',
      'features',
      'form',
      'language-switcher',
    ]);
    for (const block of renderBuiltinBlocks) {
      expect(registry.has(block.type)).toBe(true);
    }
  });

  it('ships no editor panel, so the public bundle never pulls the UI kit', () => {
    for (const block of renderBuiltinBlocks) {
      expect(block.Panel).toBeUndefined();
    }
  });

  it('renders a block tree to static HTML', () => {
    const html = renderToStaticMarkup(
      <BlockTreeRenderer blocks={[nodeOf('hero'), nodeOf('features')]} />,
    );

    expect(html).toContain('lumio-hero');
    expect(html).toContain('lumio-features');
    expect(html.match(/<h1/g) ?? []).toHaveLength(1);
  });

  it('keeps editable markers for the editor but no client script', () => {
    const html = renderToStaticMarkup(<BlockTreeRenderer blocks={[nodeOf('paragraph')]} />);
    expect(html).toContain('data-editable-path="props.text"');
    expect(html).not.toContain('<script');
  });
});
