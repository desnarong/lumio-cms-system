import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it, vi } from 'vitest';
import { z } from 'zod';
import { blockStyleSchema, defaultBlockStyle, type BlockNode } from '@lumio/shared';
import { registerBuiltinBlocks } from '../builtins.js';
import { BlockRegistry, loadBlockData, registry } from '../registry.js';
import type { BlockDefinition, BlockLoaderContext } from '../types.js';
import { Editable } from './editable.js';
import { Img } from './img.js';
import { attachInlineEditing } from './inline-editing.js';
import { migrateBlock, upgradeBlockTree } from './migrate.js';
import { getPath, setBlockPath, setPath } from './paths.js';
import { BlockRenderer, BlockTreeRenderer, UnknownBlock } from './renderer.js';
import { BlockShell } from './shell.js';

registerBuiltinBlocks();

const node = (overrides: Partial<BlockNode> = {}): BlockNode => ({
  id: 'blk_1',
  type: 'heading',
  version: 1,
  props: { text: 'กาแฟคั่วสดจากดอย', level: 'h2', align: 'left' },
  style: defaultBlockStyle,
  children: [],
  ...overrides,
});

const loaderContext: BlockLoaderContext = {
  siteId: 'site_1',
  locale: 'th',
  db: { posts: { latest: async () => [] } },
};

const demoBlock: BlockDefinition<{ title: string; subtitle: string }> = {
  type: 'demo',
  label: 'บล็อกทดสอบ',
  category: 'text',
  version: 2,
  schema: z.object({
    version: z.literal(2),
    props: z.object({
      title: z.string(),
      subtitle: z.string().default(''),
    }),
    style: blockStyleSchema.default({}),
  }),
  defaults: { version: 2, props: { title: 'หัวข้อ', subtitle: '' }, style: defaultBlockStyle },
  Block: () => null,
  Panel: () => null,
  migrations: { 1: (props) => ({ ...props, subtitle: '' }) },
};

describe('BlockShell', () => {
  it('turns the shared style into data attributes and spacing variables', () => {
    const html = renderToStaticMarkup(
      <BlockShell
        block={node({
          style: {
            ...defaultBlockStyle,
            paddingY: 'xl',
            paddingX: 'lg',
            background: 'brand',
            animation: 'fade-up',
            visibility: { mobile: false, tablet: true, desktop: true },
          },
        })}
      >
        เนื้อหา
      </BlockShell>,
    );
    expect(html).toContain('data-block-id="blk_1"');
    expect(html).toContain('data-background="brand"');
    expect(html).toContain('data-animation="fade-up"');
    expect(html).toContain('data-visibility="tablet desktop"');
    // Padding is scaled by the site's density token (theme token --density-scale).
    expect(html).toContain('--block-padding-y:calc(var(--space-xl) * var(--density-scale, 1))');
    expect(html).toContain('--block-padding-x:calc(var(--space-lg) * var(--density-scale, 1))');
  });

  it('leaves background and animation off when they are set to none', () => {
    const html = renderToStaticMarkup(<BlockShell block={node()}>เนื้อหา</BlockShell>);
    expect(html).not.toContain('data-background');
    expect(html).not.toContain('data-animation');
    expect(html).toContain('data-visibility="mobile tablet desktop"');
  });
});

describe('Editable', () => {
  it('renders plain markup and marks the path for the editor', () => {
    const html = renderToStaticMarkup(
      <Editable as="h2" path="props.heading" value="กาแฟคั่วสดจากดอย" label="ข้อความหัวข้อ" />,
    );
    expect(html).toContain('<h2');
    expect(html).toContain('data-editable-path="props.heading"');
    expect(html).toContain('data-editable-label="ข้อความหัวข้อ"');
    expect(html).toContain('กาแฟคั่วสดจากดอย');
    expect(html).not.toContain('contenteditable');
    expect(html).not.toContain('role="textbox"');
  });

  it('keeps the placeholder out of the public markup for empty text', () => {
    const html = renderToStaticMarkup(
      <Editable as="figcaption" path="props.caption" value="" placeholder="คำบรรยายภาพ" />,
    );
    expect(html).not.toContain('>คำบรรยายภาพ<');
    expect(html).not.toMatch(/>\s*คำบรรยายภาพ\s*</);
    expect(html).toContain('data-editable-placeholder="คำบรรยายภาพ"');
  });
});

describe('Img', () => {
  it('lazy loads, keeps the alt text and derives sizes from srcset', () => {
    const html = renderToStaticMarkup(
      <Img src="/images/beans.jpg" srcSet="/images/beans-2x.jpg 2x" alt="เมล็ดกาแฟคั่ว" />,
    );
    expect(html).toContain('src="/images/beans.jpg"');
    expect(html).toMatch(/srcset="\/images\/beans-2x\.jpg 2x"/i);
    expect(html).toContain('sizes="(min-width: 1024px) 1024px, 100vw"');
    expect(html).toContain('alt="เมล็ดกาแฟคั่ว"');
    expect(html).toContain('loading="lazy"');
    expect(html).toContain('decoding="async"');
  });

  it('offers AVIF first and keeps WebP as the fallback', () => {
    const html = renderToStaticMarkup(
      <Img
        src="/images/beans-1024.webp"
        srcSet="/images/beans-480.webp 480w, /images/beans-1024.webp 1024w"
        avifSrcSet="/images/beans-480.avif 480w, /images/beans-1024.avif 1024w"
        alt="เมล็ดกาแฟคั่ว"
      />,
    );

    expect(html).toContain('<picture');
    expect(html).toContain('type="image/avif"');
    expect(html).toContain('beans-1024.avif 1024w');
    expect(html).toContain('sizes="(min-width: 1024px) 1024px, 100vw"');
    // The <img> stays inside the picture, so browsers without AVIF still load it.
    expect(html).toContain('src="/images/beans-1024.webp"');
    expect(html.indexOf('type="image/avif"')).toBeLessThan(
      html.indexOf('src="/images/beans-1024.webp"'),
    );
  });

  it('loads eagerly when the image is above the fold', () => {
    const html = renderToStaticMarkup(<Img src="/images/hero.jpg" alt="หน้าร้าน" priority />);
    expect(html).toContain('loading="eager"');
  });

  it('keeps the focal point in frame when the block crops the image', () => {
    const html = renderToStaticMarkup(
      <Img src="/images/shop.jpg" alt="หน้าร้าน" aspect="square" focalPoint={{ x: 0.2, y: 0.8 }} />,
    );

    expect(html).toContain('lumio-img--square');
    expect(html).toContain('object-position:20% 80%');
  });

  it('keeps the layout stable while no image is chosen', () => {
    const html = renderToStaticMarkup(<Img alt="ยังไม่มีรูป" aspect="wide" />);
    expect(html).not.toContain('<img');
    expect(html).toContain('data-placeholder="true"');
    expect(html).toContain('role="img"');
    expect(html).toContain('aria-label="ยังไม่มีรูป"');
    expect(html).toContain('lumio-img--wide');
  });
});

describe('paths', () => {
  it('reads nested paths and tolerates missing branches', () => {
    const source = { props: { buttons: [{ label: 'สั่งซื้อ' }] } };
    expect(getPath(source, 'props.buttons.0.label')).toBe('สั่งซื้อ');
    expect(getPath(source, 'props.missing.deep')).toBeUndefined();
  });

  it('writes immutably', () => {
    const source = { props: { buttons: [{ label: 'สั่งซื้อ' }] } };
    const next = setPath(source, 'props.buttons.0.label', 'ซื้อเลย');
    expect(getPath(next, 'props.buttons.0.label')).toBe('ซื้อเลย');
    expect(getPath(source, 'props.buttons.0.label')).toBe('สั่งซื้อ');
  });

  it('updates a block node through a panel path', () => {
    const block = node();
    const next = setBlockPath(block, 'style.paddingY', 'xl');
    expect(next.style.paddingY).toBe('xl');
    expect(block.style.paddingY).toBe('md');
    expect(next.id).toBe(block.id);
  });
});

describe('BlockRenderer', () => {
  it('renders a registered block inside the shared shell', () => {
    const html = renderToStaticMarkup(<BlockRenderer block={node()} />);
    expect(html).toContain('data-block-type="heading"');
    expect(html).toContain('<h2');
    expect(html).toContain('กาแฟคั่วสดจากดอย');
  });

  it('emits static HTML with no client-side editing hooks', () => {
    const html = renderToStaticMarkup(<BlockRenderer block={node()} />);
    expect(html).not.toContain('contenteditable');
    expect(html).toContain('data-editable-path="props.text"');
  });

  it('falls back to the block defaults when stored props are invalid', () => {
    const html = renderToStaticMarkup(
      <BlockRenderer block={node({ props: { text: 'หัวข้อ', level: 'h9' } })} />,
    );
    expect(html).toContain('หัวข้อของคุณ');
  });

  it('explains unknown block types instead of crashing', () => {
    const html = renderToStaticMarkup(<BlockRenderer block={node({ type: 'pricing' })} />);
    expect(html).toContain('ยังไม่รองรับบล็อกประเภท');
    expect(html).toContain('pricing');
  });

  it('renders nested children in order', () => {
    const html = renderToStaticMarkup(
      <BlockTreeRenderer
        blocks={[
          node({ id: 'blk_a', props: { text: 'บล็อกแรก', level: 'h2', align: 'left' } }),
          node({ id: 'blk_b', props: { text: 'บล็อกที่สอง', level: 'h3', align: 'left' } }),
        ]}
      />,
    );
    expect(html.indexOf('บล็อกแรก')).toBeLessThan(html.indexOf('บล็อกที่สอง'));
  });

  it('shows a note for a block that is not shipped in this build', () => {
    const html = renderToStaticMarkup(<UnknownBlock block={node({ type: 'gallery' })} />);
    expect(html).toContain('gallery');
  });
});

interface FakeEvent {
  key?: string;
  preventDefault?: () => void;
}

interface FakeElement {
  dataset: Record<string, string | undefined>;
  textContent: string;
  innerText: string;
  contentEditable: string;
  tabIndex: number;
  attributes: Map<string, string>;
  hasAttribute: (name: string) => boolean;
  setAttribute: (name: string, value: string) => void;
  removeAttribute: (name: string) => void;
  addEventListener: (type: string, handler: (event: unknown) => void) => void;
  removeEventListener: (type: string, handler: (event: unknown) => void) => void;
  blur: () => void;
  dispatch: (type: string, extra?: FakeEvent) => void;
}

const fakeElement = (path: string, value: string, multiline = false): FakeElement => {
  const attributes = new Map<string, string>();
  const listeners = new Map<string, (event: unknown) => void>();
  const element: FakeElement = {
    dataset: {
      editablePath: path,
      editableMultiline: multiline ? 'true' : undefined,
      editableLabel: 'ข้อความหัวข้อ',
    },
    textContent: value,
    innerText: value,
    contentEditable: 'false',
    tabIndex: -1,
    attributes,
    hasAttribute: (name) => attributes.has(name),
    setAttribute: (name, next) => void attributes.set(name, next),
    removeAttribute: (name) => void attributes.delete(name),
    addEventListener: (type, handler) => void listeners.set(type, handler),
    removeEventListener: (type) => void listeners.delete(type),
    blur: () => listeners.get('blur')?.({ target: element }),
    dispatch: (type, extra) => listeners.get(type)?.({ target: element, ...extra }),
  };
  return element;
};

const fakeRoot = (elements: FakeElement[]): HTMLElement =>
  ({
    querySelectorAll: () => elements.map((element) => element as unknown as HTMLElement),
  }) as unknown as HTMLElement;

describe('inline editing', () => {
  it('makes the text editable and reports the new value on blur', () => {
    const element = fakeElement('props.heading', 'กาแฟคั่วสด');
    const onChange = vi.fn();
    attachInlineEditing(fakeRoot([element]), { onChange });

    expect(element.contentEditable).toBe('true');
    expect(element.attributes.get('role')).toBe('textbox');
    expect(element.attributes.get('aria-label')).toBe('ข้อความหัวข้อ');
    expect(element.dataset.editableValue).toBe('กาแฟคั่วสด');

    element.textContent = 'กาแฟคั่วสดจากดอย';
    element.blur();

    expect(onChange).toHaveBeenCalledWith('props.heading', 'กาแฟคั่วสดจากดอย');
    expect(element.contentEditable).toBe('false');
    expect(element.attributes.has('role')).toBe(false);
  });

  it('stays quiet when the text was not touched', () => {
    const element = fakeElement('props.heading', 'กาแฟคั่วสด');
    const onChange = vi.fn();
    attachInlineEditing(fakeRoot([element]), { onChange });
    element.blur();
    expect(onChange).not.toHaveBeenCalled();
  });

  it('only enables the paths the editor asked for', () => {
    const heading = fakeElement('props.heading', 'หัวข้อ');
    const caption = fakeElement('props.caption', 'คำบรรยาย');
    attachInlineEditing(fakeRoot([heading, caption]), {
      onChange: () => undefined,
      paths: ['props.heading'],
    });
    expect(heading.contentEditable).toBe('true');
    expect(caption.contentEditable).toBe('false');
  });

  it('restores the previous text on Escape', () => {
    const element = fakeElement('props.heading', 'กาแฟคั่วสด');
    const onChange = vi.fn();
    attachInlineEditing(fakeRoot([element]), { onChange });

    element.textContent = 'แก้ชั่วคราว';
    element.dispatch('keydown', { key: 'Escape' });

    expect(element.textContent).toBe('กาแฟคั่วสด');
    expect(onChange).not.toHaveBeenCalled();
  });

  it('finishes editing when Enter is pressed on a single line', () => {
    const element = fakeElement('props.heading', 'กาแฟคั่วสด');
    const preventDefault = vi.fn();
    const onChange = vi.fn();
    attachInlineEditing(fakeRoot([element]), { onChange });

    element.dispatch('keydown', { key: 'Enter', preventDefault });

    expect(preventDefault).toHaveBeenCalled();
    expect(onChange).not.toHaveBeenCalled();
  });

  it('leaves the DOM as it was when detached', () => {
    const element = fakeElement('props.heading', 'กาแฟคั่วสด');
    const detach = attachInlineEditing(fakeRoot([element]), { onChange: () => undefined });
    detach();
    expect(element.contentEditable).toBe('false');
    expect(element.dataset.editableValue).toBeUndefined();
  });
});

describe('migrations', () => {
  it('upgrades stored props to the current schema version', () => {
    const blocks = new BlockRegistry();
    blocks.register(demoBlock);
    const migrated = migrateBlock(
      {
        id: 'blk_9',
        type: 'demo',
        version: 1,
        props: { title: 'กาแฟ' },
        style: defaultBlockStyle,
        children: [],
      },
      blocks,
    );
    expect(migrated.version).toBe(2);
    expect(migrated.props).toEqual({ title: 'กาแฟ', subtitle: '' });
  });

  it('migrates blocks nested inside other blocks', () => {
    const blocks = new BlockRegistry();
    blocks.register(demoBlock);
    const tree = upgradeBlockTree(
      [
        {
          id: 'blk_parent',
          type: 'section',
          version: 1,
          props: {},
          style: defaultBlockStyle,
          children: [
            {
              id: 'blk_child',
              type: 'demo',
              version: 1,
              props: { title: 'กาแฟ' },
              style: defaultBlockStyle,
              children: [],
            },
          ],
        },
      ],
      blocks,
    );
    expect(tree[0]?.children[0]?.version).toBe(2);
  });

  it('leaves unknown block types untouched', () => {
    const blocks = new BlockRegistry();
    const result = migrateBlock(node({ type: 'not-shipped' }), blocks);
    expect(result.type).toBe('not-shipped');
    expect(result.version).toBe(1);
  });
});

describe('data loaders', () => {
  it('runs the loader a dynamic block declared', async () => {
    const blocks = new BlockRegistry();
    blocks.registerLoader('latest-posts', async (ctx, params) => [
      { siteId: ctx.siteId, limit: params.limit },
    ]);
    const loader = blocks.getLoader('latest-posts');
    const data = await loader?.(loaderContext, { limit: 3 });
    expect(data).toEqual([{ siteId: 'site_1', limit: 3 }]);
  });

  it('loads through the shared registry', async () => {
    registry.registerLoader('search', async (ctx, params) => ({
      siteId: ctx.siteId,
      term: params.term,
    }));
    await expect(loadBlockData('search', loaderContext, { term: 'กาแฟ' })).resolves.toEqual({
      siteId: 'site_1',
      term: 'กาแฟ',
    });
  });

  it('fails loudly when a dynamic block forgot its loader', async () => {
    await expect(loadBlockData('latest-posters', loaderContext)).rejects.toThrow(
      /no data loader registered/,
    );
  });
});
