import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import { Button } from './button.js';
import { Card } from './card.js';
import { Input } from './input.js';

describe('Button', () => {
  it('renders a primary button by default', () => {
    const html = renderToStaticMarkup(<Button>บันทึก</Button>);
    expect(html).toContain('ui-button--primary');
    expect(html).toContain('ui-button--md');
    expect(html).toContain('บันทึก');
  });

  it('honours variant and type overrides', () => {
    const html = renderToStaticMarkup(
      <Button variant="danger" type="submit">
        ลบ
      </Button>,
    );
    expect(html).toContain('ui-button--danger');
    expect(html).toContain('type="submit"');
  });
});

describe('Input', () => {
  it('flags invalid state for assistive tech', () => {
    const html = renderToStaticMarkup(<Input invalid defaultValue="x" />);
    expect(html).toContain('ui-input--invalid');
    expect(html).toContain('aria-invalid="true"');
  });
});

describe('Card', () => {
  it('renders children inside the card shell', () => {
    const html = renderToStaticMarkup(<Card>เนื้อหา</Card>);
    expect(html).toContain('ui-card');
    expect(html).toContain('เนื้อหา');
  });
});
