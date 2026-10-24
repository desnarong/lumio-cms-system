import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it, vi } from 'vitest';
import { MessagesProvider } from '@lumio/ui';
import { SlashMenu } from './SlashMenu.js';

const render = (): string =>
  renderToStaticMarkup(
    <MessagesProvider locale="th">
      <SlashMenu onPick={vi.fn()} onClose={vi.fn()} top={120} left={48} />
    </MessagesProvider>,
  );

describe('SlashMenu', () => {
  it('can be dismissed without choosing a block', () => {
    const html = render();

    expect(html).toContain('editor-slash-layer');
    expect(html).toContain('aria-modal="true"');
    expect(html).toContain('aria-label="ปิด"');
  });

  it('opens where the add button was clicked', () => {
    const html = render();

    expect(html).toContain('--slash-top:120px');
    expect(html).toContain('--slash-left:48px');
  });

  it('still offers search and explains an empty result', () => {
    const html = render();

    expect(html).toContain('เพิ่มส่วนใหม่');
    expect(html).toContain('ค้นหาส่วนที่ต้องการ');
  });
});
