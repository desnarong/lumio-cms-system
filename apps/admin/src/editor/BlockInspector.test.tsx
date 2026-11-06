import { registerBuiltinBlocks } from '@lumio/blocks';
import type { BlockNode } from '@lumio/shared';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import { BlockInspector } from './BlockInspector.js';

registerBuiltinBlocks();

/** A hero as a template stored it, before the floating-image field existed. */
const oldHero = {
  id: 'blk_old_hero',
  type: 'hero',
  version: 1,
  props: { heading: 'กาแฟคั่วสดจากดอย', layout: 'split-right', image: null, buttons: [] },
  style: {
    paddingX: 'md',
    paddingY: 'xl',
    background: 'muted',
    visibility: { mobile: true, tablet: true, desktop: true },
  },
  children: [],
} as unknown as BlockNode;

describe('BlockInspector', () => {
  it('opens the panel of a block saved without newer optional fields', () => {
    const html = renderToStaticMarkup(
      <BlockInspector
        block={oldHero}
        device="desktop"
        panelMode="simple"
        onPanelModeChange={() => undefined}
        onChange={() => undefined}
      />,
    );

    expect(html).toContain('editor-inspector');
    expect(html).toContain('(0/6)');
  });
});
