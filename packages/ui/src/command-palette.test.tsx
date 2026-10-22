import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import { CommandPalette } from './command-palette.js';

const sections = [
  { id: 'goto', label: 'ไปที่', items: [{ id: 'pages', label: 'หน้าเว็บ' }] },
  {
    id: 'content',
    label: 'เนื้อหา',
    items: [{ id: 'home', label: 'หน้าแรก', hint: '/' }],
  },
];

describe('CommandPalette', () => {
  it('renders nothing while closed', () => {
    const html = renderToStaticMarkup(
      <CommandPalette
        open={false}
        query=""
        sections={sections}
        onQueryChange={() => {}}
        onSelect={() => {}}
        onClose={() => {}}
      />,
    );
    expect(html).toBe('');
  });

  it('renders an accessible palette with grouped, keyboard-selectable items', () => {
    const html = renderToStaticMarkup(
      <CommandPalette
        open
        query="หน้า"
        sections={sections}
        onQueryChange={() => {}}
        onSelect={() => {}}
        onClose={() => {}}
      />,
    );

    expect(html).toContain('role="dialog"');
    expect(html).toContain('aria-label="ค้นหาคำสั่ง"');
    expect(html).toContain('role="combobox"');
    expect(html).toContain('value="หน้า"');
    expect(html).toContain('ไปที่');
    expect(html).toContain('เนื้อหา');
    expect(html).toContain('หน้าเว็บ');
    expect(html).toContain('aria-selected="true"');
  });

  it('explains an empty result instead of showing a blank list', () => {
    const html = renderToStaticMarkup(
      <CommandPalette
        open
        query="zzz"
        sections={[]}
        onQueryChange={() => {}}
        onSelect={() => {}}
        onClose={() => {}}
      />,
    );
    expect(html).toContain('ไม่พบสิ่งที่ค้นหา');
  });
});
