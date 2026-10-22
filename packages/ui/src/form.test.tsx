import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import { ColorPicker } from './color-picker.js';
import { ImagePicker } from './image-picker.js';
import { LinkPicker } from './link-picker.js';
import { Select } from './select.js';
import { Slider } from './slider.js';
import { Switch } from './switch.js';
import { TextField } from './text-field.js';
import { Textarea } from './textarea.js';

describe('TextField', () => {
  it('wires the label, error and described-by ids together', () => {
    const html = renderToStaticMarkup(
      <TextField
        id="site-name"
        label="ชื่อเว็บไซต์"
        error="ต้องกรอกชื่อเว็บไซต์"
        defaultValue=""
      />,
    );
    expect(html).toContain('for="site-name"');
    expect(html).toContain('id="site-name"');
    expect(html).toContain('aria-invalid="true"');
    expect(html).toContain('aria-describedby="site-name-error"');
    expect(html).toContain('id="site-name-error"');
    expect(html).toContain('role="alert"');
  });

  it('shows the hint when there is no error', () => {
    const html = renderToStaticMarkup(
      <TextField id="slug" label="ลิงก์" hint="ใช้ตัวอักษรอังกฤษ" />,
    );
    expect(html).toContain('aria-describedby="slug-hint"');
    expect(html).not.toContain('aria-invalid');
  });

  it('marks required fields', () => {
    const html = renderToStaticMarkup(<TextField id="a" label="ชื่อ" required />);
    expect(html).toContain('ui-field__required');
    expect(html).toContain('required');
  });
});

describe('Textarea', () => {
  it('renders a resizable textarea with a label', () => {
    const html = renderToStaticMarkup(
      <Textarea id="about" label="เกี่ยวกับร้าน" rows={6} defaultValue="สวัสดี" />,
    );
    expect(html).toContain('ui-textarea');
    expect(html).toContain('rows="6"');
    expect(html).toContain('สวัสดี');
  });

  it('flags invalid state when an error is given', () => {
    const html = renderToStaticMarkup(<Textarea id="about" error="ยาวเกินไป" />);
    expect(html).toContain('ui-input--invalid');
    expect(html).toContain('aria-invalid="true"');
  });
});

describe('Select', () => {
  it('renders options and a placeholder', () => {
    const html = renderToStaticMarkup(
      <Select
        id="template"
        label="เทมเพลต"
        placeholder="เลือกเทมเพลต"
        options={[
          { value: 'cafe', label: 'ร้านกาแฟ' },
          { value: 'clinic', label: 'คลินิก' },
        ]}
      />,
    );
    expect(html).toContain('ui-select');
    expect(html).toContain('ร้านกาแฟ');
    expect(html).toContain('คลินิก');
    expect(html).toContain('เลือกเทมเพลต');
  });
});

describe('Switch', () => {
  it('starts off and exposes the switch role', () => {
    const html = renderToStaticMarkup(<Switch label="เผยแพร่ทันที" />);
    expect(html).toContain('role="switch"');
    expect(html).toContain('aria-checked="false"');
    expect(html).toContain('เผยแพร่ทันที');
  });

  it('reflects the checked state and description', () => {
    const html = renderToStaticMarkup(
      <Switch id="publish" label="เผยแพร่" description="ลูกค้าเห็นได้ทันที" checked />,
    );
    expect(html).toContain('aria-checked="true"');
    expect(html).toContain('aria-describedby="publish-description"');
  });

  it('submits its value through a hidden input when named', () => {
    const html = renderToStaticMarkup(<Switch name="publish" defaultChecked />);
    expect(html).toContain('type="hidden"');
    expect(html).toContain('name="publish"');
    expect(html).toContain('value="true"');
  });
});

describe('Slider', () => {
  it('renders a range input with the current value', () => {
    const html = renderToStaticMarkup(
      <Slider id="spacing" label="ระยะห่าง" min={0} max={64} step={8} defaultValue={24} />,
    );
    expect(html).toContain('type="range"');
    expect(html).toContain('min="0"');
    expect(html).toContain('max="64"');
    expect(html).toContain('step="8"');
    expect(html).toContain('>24<');
  });
});

describe('ColorPicker', () => {
  it('shows the hex value and preset buttons', () => {
    const html = renderToStaticMarkup(
      <ColorPicker id="brand" label="สีหลัก" value="#6366F1" presets={['#6366F1', '#F472B6']} />,
    );
    expect(html).toContain('type="color"');
    expect(html).toContain('value="#6366F1"');
    expect(html).toContain('aria-label="ใช้สี #6366F1"');
  });

  it('flags an invalid hex value', () => {
    const html = renderToStaticMarkup(<ColorPicker id="brand" value="not-a-color" />);
    expect(html).toContain('ui-input--invalid');
    expect(html).toContain('aria-invalid="true"');
  });
});

describe('ImagePicker', () => {
  it('shows a placeholder and a pick button when empty', () => {
    const html = renderToStaticMarkup(<ImagePicker id="hero" label="ภาพหลัก" />);
    expect(html).toContain('ui-image-picker__placeholder');
    expect(html).toContain('เลือกภาพ');
  });

  it('shows the image and a remove action when filled', () => {
    const html = renderToStaticMarkup(
      <ImagePicker id="hero" label="ภาพหลัก" value="https://cdn.lumio.dev/a.jpg" alt="ร้านกาแฟ" />,
    );
    expect(html).toContain('src="https://cdn.lumio.dev/a.jpg"');
    expect(html).toContain('alt="ร้านกาแฟ"');
    expect(html).toContain('ลบภาพ');
    expect(html).toContain('เปลี่ยนภาพ');
  });
});

describe('LinkPicker', () => {
  it('renders a url field, an external toggle and a page picker', () => {
    const html = renderToStaticMarkup(
      <LinkPicker id="cta" label="ลิงก์ปุ่ม" value="/ติดต่อ" external onPickPage={() => {}} />,
    );
    expect(html).toContain('value="/ติดต่อ"');
    expect(html).toContain('เปิดในแท็บใหม่');
    expect(html).toContain('เลือกหน้า');
    expect(html).toContain('aria-checked="true"');
  });
});
