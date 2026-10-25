import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import type { BlockNode, PublicForm } from '@lumio/shared';
import { builtinBlocks, registerBuiltinBlocks } from '../builtins.js';
import { FormsCatalogProvider } from '../engine/forms.js';
import { MediaPickerProvider, type MediaPickerApi } from '../engine/media-picker.js';
import { setBlockPath } from '../engine/paths.js';
import { BlockRenderer } from '../engine/renderer.js';
import type { AnyBlockDefinition, LanguageLink } from '../types.js';

registerBuiltinBlocks();

const byType = (type: string): AnyBlockDefinition => {
  const block = builtinBlocks.find((candidate) => candidate.type === type);
  if (!block) {
    throw new Error(`block "${type}" is not registered`);
  }
  return block;
};

const dataFor = (type: string, props?: Record<string, unknown>) => {
  const block = byType(type);
  return block.schema.parse(props ? { ...block.defaults, props } : block.defaults);
};

const nodeFor = (type: string, props?: Record<string, unknown>): BlockNode => {
  const data = dataFor(type, props);
  return {
    id: `blk_${type}`,
    type,
    version: data.version,
    props: data.props,
    style: data.style,
    children: [],
  };
};

const render = (type: string, props?: Record<string, unknown>): string =>
  renderToStaticMarkup(<BlockRenderer block={nodeFor(type, props)} />);

const renderPanel = (type: string, mode: 'simple' | 'pro' = 'simple'): string => {
  const block = byType(type);
  const data = dataFor(type);
  const Panel = block.Panel;
  return renderToStaticMarkup(
    <Panel props={data.props} style={data.style} mode={mode} onChange={() => undefined} />,
  );
};

const renderPanelWithPicker = (type: string, api: MediaPickerApi | null): string => {
  const block = byType(type);
  const data = dataFor(type);
  const Panel = block.Panel;
  return renderToStaticMarkup(
    <MediaPickerProvider api={api}>
      <Panel props={data.props} style={data.style} mode="simple" onChange={() => undefined} />
    </MediaPickerProvider>,
  );
};

describe('starter blocks', () => {
  it('ships blocks covering text, media, interactive and landing categories', () => {
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
    expect(builtinBlocks.map((block) => block.category)).toEqual([
      'text',
      'text',
      'media',
      'interactive',
      'landing',
      'landing',
      'landing',
      'dynamic',
      'interactive',
      'interactive',
    ]);
  });

  it('applies a width and minimum height set by dragging in the editor', () => {
    const node = nodeFor('paragraph');
    const html = renderToStaticMarkup(
      <BlockRenderer
        block={{ ...node, style: { ...node.style, widthPx: 640, heightPx: 320 } }}
      />,
    );

    expect(html).toContain('--block-width:640px');
    expect(html).toContain('--block-height:320px');
    expect(html).toContain('data-custom-width="true"');
    expect(html).toContain('data-custom-height="true"');
  });

  it('can space the top and bottom separately and nudge the block vertically', () => {
    const node = nodeFor('paragraph');
    const html = renderToStaticMarkup(
      <BlockRenderer
        block={{
          ...node,
          style: {
            ...node.style,
            paddingTopPx: 40,
            paddingBottomPx: 12,
            marginTopPx: -24,
          },
        }}
      />,
    );

    expect(html).toContain('--block-padding-top:40px');
    expect(html).toContain('--block-padding-bottom:12px');
    expect(html).toContain('--block-margin-top:-24px');
  });

  it('scales a block’s text from the panel size slider', () => {
    const node = nodeFor('paragraph');
    const html = renderToStaticMarkup(
      <BlockRenderer block={{ ...node, style: { ...node.style, textScale: 140 } }} />,
    );

    expect(html).toContain('--block-text-scale:1.4');
    expect(html).toContain('data-text-scale="true"');
  });

  it('offers width and height controls in the style panel', () => {
    const html = renderPanel('paragraph');

    expect(html).toContain('ความกว้างสูงสุด (px)');
    expect(html).toContain('ความสูงขั้นต่ำ (px)');
    expect(html).toContain('ระยะห่างด้านบน (px)');
    expect(html).toContain('ระยะห่างด้านล่าง (px)');
    expect(html).toContain('เลื่อนบล็อกขึ้น/ลง (px)');
  });

  it('uses real Thai copy in every block that carries text', () => {    for (const type of [
      'heading',
      'paragraph',
      'button',
      'hero',
      'features',
      'products',
      'posts',
      'form',
    ]) {
      expect(JSON.stringify(byType(type).defaults)).toMatch(/[\u0E00-\u0E7F]/);
    }
  });

  it('never ships lorem ipsum filler', () => {
    for (const block of builtinBlocks) {
      expect(JSON.stringify(block.defaults)).not.toMatch(/lorem|ipsum/i);
    }
  });
});

describe('heading block', () => {
  it('renders the chosen level, text and alignment', () => {
    const html = render('heading', { text: 'กาแฟคั่วสดจากดอย', level: 'h1', align: 'center' });
    expect(html).toContain('<h1');
    expect(html).toContain('กาแฟคั่วสดจากดอย');
    expect(html).toContain('lumio-heading--h1');
    expect(html).toContain('text-align:center');
  });
});

describe('paragraph block', () => {
  it('renders a paragraph with the lead size', () => {
    const html = render('paragraph', { text: 'ส่งตรงถึงบ้านคุณทั่วประเทศ', size: 'lg' });
    expect(html).toContain('<p');
    expect(html).toContain('ส่งตรงถึงบ้านคุณทั่วประเทศ');
    expect(html).toContain('lumio-paragraph--lg');
  });
});

describe('image block', () => {
  it('keeps the layout stable while no picture is chosen', () => {
    expect(render('image')).toContain('data-placeholder="true"');
  });

  it('renders a lazy image with an alt text and a caption', () => {
    const html = render('image', {
      image: { mediaId: 'med_1', alt: 'เมล็ดกาแฟคั่ว', src: '/images/beans.jpg' },
      caption: 'คั่วสดทุกสัปดาห์',
    });
    expect(html).toContain('src="/images/beans.jpg"');
    expect(html).toContain('alt="เมล็ดกาแฟคั่ว"');
    expect(html).toContain('loading="lazy"');
    expect(html).toContain('<figcaption');
    expect(html).toContain('คั่วสดทุกสัปดาห์');
  });

  it('zooms the crop and keeps the chosen focal point', () => {
    const html = render('image', {
      image: {
        mediaId: 'med_1',
        alt: 'เมล็ดกาแฟคั่ว',
        src: '/images/beans.jpg',
        focalPoint: { x: 0.2, y: 0.8 },
      },
      zoom: 160,
    });

    expect(html).toContain('object-position:20% 80%');
    expect(html).toContain('transform:scale(1.6)');
  });

  it('offers crop controls in the image panel', () => {
    const html = renderPanel('image');

    expect(html).toContain('ครอปรูป');
    expect(html).toContain('ซูมรูป (%)');
    expect(html).toContain('ตำแหน่งแนวนอน (%)');
    expect(html).toContain('ตำแหน่งแนวตั้ง (%)');
    expect(html).toContain('เลื่อนรูปขึ้น');
  });
});

describe('button block', () => {
  it('renders a link styled like a button', () => {
    const html = render('button', {
      label: 'สั่งซื้อเลย',
      href: '/shop',
      variant: 'primary',
      size: 'lg',
    });
    expect(html).toContain('href="/shop"');
    expect(html).toContain('ui-button--primary');
    expect(html).toContain('ui-button--lg');
    expect(html).toContain('สั่งซื้อเลย');
  });

  it('opens external links safely', () => {
    const html = render('button', { href: 'https://example.com', external: true });
    expect(html).toContain('target="_blank"');
    expect(html).toContain('rel="noopener noreferrer"');
  });

  it('falls back to a safe link when a stored href would run script', () => {
    const block = byType('button');
    const html = renderToStaticMarkup(
      <BlockRenderer
        block={{
          id: 'blk_button',
          type: 'button',
          version: 1,
          props: { ...block.defaults.props, href: 'javascript:alert(1)' },
          style: block.defaults.style,
          children: [],
        }}
      />,
    );
    expect(html).not.toContain('javascript:');
    expect(html).toContain('href="/"');
  });
});

describe('hero block', () => {
  it('moves and resizes one text without moving the whole banner', () => {
    const node = nodeFor('hero');
    const html = renderToStaticMarkup(
      <BlockRenderer
        block={{
          ...node,
          textLayouts: { 'props.heading': { x: 24, y: -8, scale: 120 } },
        }}
      />,
    );

    expect(html).toContain('translate(24px, -8px)');
    expect(html).toContain('zoom:1.2');
  });

  it('renders a single h1, both calls to action and a priority image', () => {
    const html = render('hero', {
      image: { mediaId: 'med_2', alt: 'บรรยากาศร้านกาแฟ', src: '/images/hero.jpg' },
    });
    expect(html).toContain('lumio-hero--split-right');
    expect(html.match(/<h1/g) ?? []).toHaveLength(1);
    expect(html).toContain('สั่งซื้อเลย');
    expect(html).toContain('เรื่องราวของเรา');
    expect(html).toContain('loading="eager"');
    expect(html).toContain('alt="บรรยากาศร้านกาแฟ"');
    expect(html).toContain('lumio-hero__note');
    expect(html).toContain('ส่งฟรีเมื่อสั่งครบ 500 บาท');
  });

  it('puts the text on top of the picture in the full-bleed overlay layout', () => {
    const html = render('hero', {
      layout: 'overlay',
      heading: 'Light That Feel',
      image: { mediaId: 'med_2', alt: 'หลอดไฟ LED', src: '/images/banner.jpg' },
    });
    expect(html).toContain('lumio-hero--overlay');
    expect(html).toContain('lumio-hero__background');
    expect(html).toContain('Light That Feel');
    expect(html.match(/<h1/g) ?? []).toHaveLength(1);
  });

  it('can keep the real picture height instead of cropping to the viewport', () => {
    const html = render('hero', {
      layout: 'overlay',
      heightMode: 'image',
      image: { mediaId: 'med_2', alt: 'แบนเนอร์', src: '/images/banner.jpg', width: 1440, height: 701 },
    });
    expect(html).toContain('data-height="image"');
    expect(html).toContain('--hero-aspect:1440 / 701');
  });

  it('exposes the headline size and wide content choice to the stylesheet', () => {
    const html = render('hero', {
      layout: 'overlay',
      headingSize: 'xl',
      contentWidth: 'wide',
    });
    expect(html).toContain('data-heading-size="xl"');
    expect(html).toContain('data-content-width="wide"');
  });

  it('floats several pictures over the banner at proportional offsets', () => {
    const html = render('hero', {
      layout: 'overlay',
      backgroundZoom: 140,
      backgroundX: 30,
      backgroundY: 70,
      scrimOpacity: 60,
      foregrounds: [
        {
          image: { mediaId: 'med_3', alt: 'หลอดไฟ', src: '/images/bulb.png' },
          width: 280,
          x: 40,
          y: -20,
          shadow: true,
        },
        {
          image: { mediaId: 'med_4', alt: 'โคมไฟ', src: '/images/lamp.png' },
          width: 160,
          x: 320,
          y: 10,
          shadow: false,
        },
      ],
    });
    expect(html).toContain('--hero-zoom:1.4');
    expect(html).toContain('--hero-x:30%');
    expect(html).toContain('--hero-y:70%');
    expect(html).toContain('--hero-scrim:0.6');
    expect(html.match(/lumio-hero__foreground/g) ?? []).toHaveLength(2);
    expect(html).toContain('width:19.44%');
    expect(html).toContain('right:2.78%');
    expect(html).toContain('bottom:-2.47%');
    expect(html).toContain('data-shadow="true"');
    expect(html).toContain('alt="หลอดไฟ"');
    expect(html).toContain('alt="โคมไฟ"');
  });

  it('spaces the split picture and text by a share of the banner', () => {
    const html = render('hero', { layout: 'split-right', splitGap: 6 });

    expect(html).toContain('--hero-split-gap:6%');
    expect(html).toContain('--hero-split-gap-vw:6vw');
  });

  it('lets the owner choose how wide the description runs', () => {
    const html = render('hero', { layout: 'overlay', subheadingWidth: 40 });

    expect(html).toContain('--hero-copy-width:40%');
  });

  it('swaps the banner picture on hover when one is chosen', () => {
    const html = render('hero', {
      layout: 'overlay',
      image: { mediaId: 'med_2', alt: 'แบนเนอร์', src: '/images/banner.jpg' },
      hoverImage: { mediaId: 'med_6', alt: '', src: '/images/banner-hover.jpg' },
    });

    expect(html).toContain('data-banner-hover="true"');
    expect(html).toContain('lumio-hero__image-hover');
    expect(html).toContain('/images/banner-hover.jpg');
  });

  it('exposes the block text alignment so constrained copy can centre too', () => {
    const node = nodeFor('paragraph');
    const html = renderToStaticMarkup(
      <BlockRenderer block={{ ...node, style: { ...node.style, textAlign: 'center' } }} />,
    );

    expect(html).toContain('data-text-align="center"');
  });

  it('requests a source wide enough for the zoomed full-bleed photo', () => {
    const html = render('hero', {
      layout: 'overlay',
      backgroundZoom: 140,
      image: { mediaId: 'med_2', alt: 'แบนเนอร์', src: '/images/banner.jpg' },
    });

    expect(html).toContain('sizes="140vw"');
  });

  it('keeps a cut-out in the same relative place when the banner is resized', () => {
    const html = render('hero', {
      layout: 'overlay',
      foregrounds: [
        {
          image: { mediaId: 'med_3', alt: 'หลอดไฟ', src: '/images/bulb.png' },
          width: 280,
          widthPercent: 20,
          x: 40,
          xPercent: 5,
          y: -20,
          yPercent: 10,
          anchorX: 'left',
          anchorY: 'top',
        },
      ],
    });

    expect(html).toContain('width:20%');
    expect(html).toContain('left:5%');
    expect(html).toContain('top:10%');
  });

  it('paints the floating cut-outs on the split layouts too', () => {
    const html = render('hero', {
      layout: 'split-left',
      foregrounds: [
        {
          image: { mediaId: 'med_3', alt: 'หลอดไฟ', src: '/images/bulb.png' },
          widthPercent: 20,
          xPercent: 5,
          yPercent: 10,
          anchorX: 'left',
          anchorY: 'top',
        },
      ],
    });

    expect(html).toContain('lumio-hero--split-left');
    expect(html).toContain('lumio-hero__foreground');
    expect(html).toContain('width:20%');
  });

  it('swaps a foreground picture on hover', () => {
    const html = render('hero', {
      layout: 'overlay',
      foregrounds: [
        {
          image: { mediaId: 'med_3', alt: 'หลอดไฟ', src: '/images/bulb.png' },
          hoverImage: { mediaId: 'med_5', alt: '', src: '/images/bulb-on.png' },
          width: 280,
          x: 40,
          y: -20,
          shadow: true,
        },
      ],
    });
    expect(html).toContain('data-hover-image="true"');
    expect(html).toContain('lumio-hero__foreground-hover');
    expect(html).toContain('src="/images/bulb-on.png"');
  });
});

describe('features block', () => {
  it('renders one card per item in the chosen column layout', () => {
    const html = render('features', { columns: '4' });
    expect(html).toContain('data-columns="4"');
    expect(html.match(/<li/g) ?? []).toHaveLength(3);
    expect(html).toContain('คั่วสดทุกสัปดาห์');
    expect(html).toContain('ปรึกษาการชงได้ทุกวัน');
  });

  it('lets the intro use the full width when asked', () => {
    const html = render('features', { subheadingWidth: 'full' });
    expect(html).toContain('data-subheading-width="full"');
  });

  it('can join plain cards edge to edge', () => {
    const html = render('features', { cardStyle: 'plain', cardGap: 'none' });
    expect(html).toContain('data-card-style="plain"');
    expect(html).toContain('data-card-gap="none"');
  });

  it('can hide the icon and use a taller photo crop', () => {
    const html = render('features', {
      items: [
        {
          showIcon: false,
          iconName: 'sun',
          image: { mediaId: 'med_2', alt: 'ห้องนั่งเล่น', src: '/images/room.jpg' },
          mediaAspect: 'photo',
          title: 'ไม่มีไอคอน',
          description: 'ทดสอบ',
        },
      ],
    });
    expect(html).not.toContain('lumio-features__icon');
    expect(html).toContain('lumio-img--photo');
  });

  it('can align the icon and text left, centre or right', () => {
    const html = render('features', { contentAlign: 'center' });
    expect(html).toContain('data-content-align="center"');
  });

  it('can paint the text on top of the card picture', () => {
    const html = render('features', { textOverlay: true });
    expect(html).toContain('data-text-overlay="true"');
  });

  it('offers full-width cards, a fixed height, text panels and hover buttons', () => {
    const html = render('features', {
      fullWidth: true,
      cardHeight: 420,
      textBackground: true,
      textFlushBottom: true,
      buttonVisibility: 'hover',
      items: [{ iconName: 'sun', iconSize: 64, title: 'ไอคอนใหญ่', description: 'ทดสอบ' }],
    });
    expect(html).toContain('data-full-width="true"');
    expect(html).toContain('--feature-card-height:420px');
    expect(html).toContain('data-text-background="true"');
    expect(html).toContain('data-text-flush-bottom="true"');
    expect(html).toContain('data-text-background-mode="panel"');
    expect(html).toContain('data-button-visibility="hover"');
    expect(html).toContain('--feature-icon-size:64px');
  });

  it('swaps in a second picture when the card is hovered', () => {
    const html = render('features', {
      items: [
        {
          image: { mediaId: 'med_a', alt: 'ปกติ', src: '/images/a.jpg' },
          hoverImage: { mediaId: 'med_b', alt: '', src: '/images/b.jpg' },
          title: 'hover',
          description: 'ทดสอบ',
        },
      ],
    });
    expect(html).toContain('lumio-features__image--hover');
    expect(html).toContain('src="/images/b.jpg"');
  });

  it('draws a real line icon instead of the emoji fallback when one is chosen', () => {
    const html = render('features', {
      items: [{ icon: '🔆', iconName: 'sun', title: 'แสงนวล', description: 'ทดสอบไอคอน' }],
    });
    expect(html).toContain('lumio-features__icon--line');
    expect(html).toContain('class="ui-icon"');
    expect(html).not.toContain('🔆');
  });

  it('can use an uploaded picture as the icon and crops the card picture as asked', () => {
    const html = render('features', {
      items: [
        {
          iconImage: { mediaId: 'med_icon', alt: 'ไอคอนหลอดไฟ', src: '/images/icon.png' },
          image: { mediaId: 'med_2', alt: 'ห้องนั่งเล่น', src: '/images/room.jpg' },
          mediaAspect: 'square',
          mediaFit: 'contain',
          mediaPosition: 'top',
          title: 'ไอคอนรูปภาพ',
          description: 'ทดสอบรูปไอคอน',
        },
      ],
    });
    expect(html).toContain('lumio-features__icon--image');
    expect(html).toContain('alt="ไอคอนหลอดไฟ"');
    expect(html).toContain('lumio-img--square');
    expect(html).toContain('data-fit="contain"');
    expect(html).toContain('object-position:50% 0%');
  });
});

describe('form block', () => {
  const contactForm: PublicForm = {
    id: '11111111-1111-4111-8111-111111111111',
    name: 'ติดต่อเรา',
    successMessage: 'ได้รับข้อความแล้ว ขอบคุณ',
    fields: [
      { id: 'fld_name', name: 'name', label: 'ชื่อของคุณ', type: 'text', required: true, options: [] },
      {
        id: 'fld_topic',
        name: 'topic',
        label: 'เรื่องที่ติดต่อ',
        type: 'select',
        required: false,
        options: ['ซื้อกาแฟ', 'ขอใบเสนอราคา'],
      },
      {
        id: 'fld_message',
        name: 'message',
        label: 'ข้อความ',
        type: 'textarea',
        required: false,
        options: [],
      },
    ],
  };

  const renderForm = (
    props?: Record<string, unknown>,
    forms: PublicForm[] = [contactForm],
  ): string => renderToStaticMarkup(<BlockRenderer block={nodeFor('form', props)} forms={forms} />);

  it('asks the user to pick a form until one is chosen', () => {
    const html = renderForm(undefined, []);
    expect(html).toContain('ยังไม่ได้เลือกแบบฟอร์ม');
  });

  it('renders the chosen form as a plain POST form', () => {
    const html = renderForm({ formId: contactForm.id });
    expect(html).toContain(`action="/forms/${contactForm.id}"`);
    expect(html).toContain('method="post"');
    expect(html).toContain('name="name"');
    expect(html).toContain('required=""');
    expect(html).toContain('ซื้อกาแฟ');
    expect(html).toContain('ส่งข้อความ');
  });

  it('hides a honeypot field to catch bots', () => {
    const html = renderForm({ formId: contactForm.id });
    expect(html).toContain('name="_hp"');
    expect(html).toContain('lumio-form__honeypot');
  });

  it('offers the site forms in the panel', () => {
    const block = byType('form');
    const data = dataFor('form');
    const Panel = block.Panel;
    const html = renderToStaticMarkup(
      <FormsCatalogProvider forms={[contactForm]}>
        <Panel props={data.props} style={data.style} mode="simple" onChange={() => undefined} />
      </FormsCatalogProvider>,
    );
    expect(html).toContain(`value="${contactForm.id}"`);
    expect(html).toContain('ติดต่อเรา');
  });
});

describe('editor panels', () => {
  for (const block of builtinBlocks) {
    it(`renders the ${block.type} panel in simple and pro mode`, () => {
      const simple = renderPanel(block.type);
      expect(simple).toContain('lumio-panel-section');
      expect(simple).toContain('ui-field');
      expect(simple).not.toContain('ขั้นสูง');

      const pro = renderPanel(block.type, 'pro');
      expect(pro).toContain('ขั้นสูง');
    });
  }

  it('applies a panel change to the rendered block', () => {
    const updated = setBlockPath(nodeFor('hero'), 'props.heading', 'กาแฟคั่วใหม่ประจำเดือนนี้');
    expect(renderToStaticMarkup(<BlockRenderer block={updated} />)).toContain(
      'กาแฟคั่วใหม่ประจำเดือนนี้',
    );
  });

  it('applies a nested list change to the rendered block', () => {
    const updated = setBlockPath(nodeFor('features'), 'props.items.0.title', 'คั่วสดทุกวัน');
    expect(renderToStaticMarkup(<BlockRenderer block={updated} />)).toContain('คั่วสดทุกวัน');
  });
});

describe('media picker wiring', () => {
  it('disables the image picker when no library is connected', () => {
    const html = renderPanel('image');
    expect(html).toContain('ยังไม่ได้เชื่อมคลังรูปภาพในหน้านี้');
    expect(html).toContain('disabled');
  });

  it('enables the picker once the editor provides one', () => {
    const api: MediaPickerApi = { pick: async () => null };
    const html = renderPanelWithPicker('image', api);

    expect(html).not.toContain('ยังไม่ได้เชื่อมคลังรูปภาพในหน้านี้');
    expect(html).toContain('เลือกภาพ');
    expect(html).toContain('ui-button--secondary ui-button--sm">เลือกภาพ');
  });

  it('keeps the hero image picker in the same state', () => {
    expect(renderPanel('hero')).toContain('ยังไม่ได้เชื่อมคลังรูปภาพในหน้านี้');
    expect(renderPanelWithPicker('hero', { pick: async () => null })).not.toContain(
      'ยังไม่ได้เชื่อมคลังรูปภาพในหน้านี้',
    );
  });
});

describe('language switcher block', () => {
  const languages: LanguageLink[] = [
    { locale: 'th', label: 'ไทย', href: '/', active: true, available: true },
    { locale: 'en', label: 'English', href: '/en', active: false, available: true },
    { locale: 'fr', label: 'Français', href: '/fr', active: false, available: false },
  ];

  it('renders one link per language the page has, marking the current one', () => {
    const html = renderToStaticMarkup(
      <BlockRenderer block={nodeFor('language-switcher')} languages={languages} />,
    );

    expect(html).toContain('href="/en"');
    expect(html).toContain('hreflang="en"');
    expect(html).toContain('aria-current="true"');
    // A language with no version yet is hidden by default.
    expect(html).not.toContain('Français');
  });

  it('can show languages with no translation yet, greyed out', () => {
    const html = renderToStaticMarkup(
      <BlockRenderer
        block={nodeFor('language-switcher', { showUnavailable: true })}
        languages={languages}
      />,
    );

    expect(html).toContain('Français');
    expect(html).toContain('aria-disabled="true"');
  });

  it('says so in the editor when no language list is available', () => {
    const html = renderToStaticMarkup(<BlockRenderer block={nodeFor('language-switcher')} />);
    expect(html).toContain('ยังมีภาษาที่เผยแพร่แล้วเพียงภาษาเดียว');
  });

  it('renders nothing on the site when there is only one language', () => {
    const html = renderToStaticMarkup(
      <BlockRenderer
        block={nodeFor('language-switcher')}
        languages={[{ locale: 'th', label: 'ไทย', href: '/', active: true, available: true }]}
      />,
    );
    expect(html).not.toContain('ยังมีภาษาที่เผยแพร่แล้วเพียงภาษาเดียว');
    expect(html).not.toContain('lumio-language');
  });
});

describe('products block', () => {
  it('renders product cards with price, badge and a call to action', () => {
    const html = render('products');
    expect(html).toContain('lumio-products__grid');
    expect(html).toContain('กาแฟคั่วอ่อน เอสเปรสโซ่');
    expect(html).toContain('lumio-products__price');
    expect(html).toContain('ขายดี');
    expect(html).toContain('ดูสินค้า');
  });

  it('shows sold-out instead of a price when the product is unavailable', () => {
    const html = render('products', {
      items: [
        {
          name: 'กาแฟหมดสต็อก',
          description: '',
          price: 100,
          currency: '฿',
          badge: '',
          link: '/shop',
          buttonLabel: 'ดูสินค้า',
          soldOut: true,
        },
      ],
    });
    expect(html).toContain('สินค้าหมด');
  });

  it('renders the live shop catalog instead of the saved cards', () => {
    const html = renderToStaticMarkup(
      <BlockRenderer
        block={nodeFor('products', { source: 'shop' })}
        shopProducts={[
          {
            id: 'p1',
            name: 'หลอดไฟ LED 9.5W',
            description: 'แสงนวล ประหยัดไฟ',
            price: 269,
            compareAtPrice: 459,
            currency: '฿',
            image: null,
            category: null,
            link: '/shop/led-9-5w',
            soldOut: false,
          },
        ]}
      />,
    );

    expect(html).toContain('หลอดไฟ LED 9.5W');
    expect(html).toContain('/shop/led-9-5w');
    expect(html).toContain('459');
    expect(html).not.toContain('กาแฟคั่วอ่อน');
  });

  it('tells the visitor when the shop has nothing published yet', () => {
    const html = renderToStaticMarkup(
      <BlockRenderer block={nodeFor('products', { source: 'shop' })} shopProducts={[]} />,
    );

    expect(html).toContain('ยังไม่มีสินค้าที่เผยแพร่ในร้าน');
    expect(html).not.toContain('lumio-products__grid');
  });
});

describe('posts block', () => {
  it('renders article cards with category, title and date', () => {
    const html = render('posts');
    expect(html).toContain('lumio-posts__grid');
    expect(html).toContain('ความรู้เรื่องกาแฟ');
    expect(html).toContain('คั่วอ่อน คั่วกลาง คั่วเข้ม ต่างกันอย่างไร');
    expect(html).toContain('12 ต.ค. 2026');
  });
});
