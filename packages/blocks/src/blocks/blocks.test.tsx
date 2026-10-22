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
      'interactive',
      'interactive',
    ]);
  });

  it('uses real Thai copy in every block that carries text', () => {
    for (const type of ['heading', 'paragraph', 'button', 'hero', 'features', 'form']) {
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
    expect(html).not.toContain('disabled');
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

  it('says so when the site has only one language', () => {
    const html = renderToStaticMarkup(<BlockRenderer block={nodeFor('language-switcher')} />);
    expect(html).toContain('ยังมีภาษาที่เผยแพร่แล้วเพียงภาษาเดียว');
  });
});
