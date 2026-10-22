import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import { Icon, type IconName } from './icon.js';
import * as ui from './index.js';

const NAMES: IconName[] = [
  'home',
  'file-text',
  'pen',
  'mail',
  'image',
  'package',
  'receipt',
  'palette',
  'compass',
  'layout',
  'layers',
  'folder',
  'grid',
  'trending-up',
  'chart-bar',
  'send',
  'app-window',
  'settings',
  'globe',
  'users',
  'database',
  'shopping-bag',
  'cart',
  'credit-card',
  'wallet',
  'search',
  'eye',
  'eye-off',
  'trash',
  'save',
  'undo',
  'redo',
  'arrow-up',
  'arrow-down',
  'arrow-right',
  'arrow-left',
  'plus',
  'minus',
  'check',
  'close',
  'chevron-down',
  'chevron-up',
  'chevron-right',
  'chevron-left',
  'calendar',
  'clock',
  'upload',
  'download',
  'external-link',
  'menu',
  'sun',
  'moon',
  'info',
  'alert-triangle',
  'alert-circle',
  'filter',
  'refresh',
  'log-out',
  'key',
  'shield',
  'zap',
  'book',
  'copy',
  'star',
  'link',
  'type',
  'align-left',
  'monitor',
  'tablet',
  'smartphone',
  'sparkles',
  'grip',
  'more-vertical',
  'inbox',
  'qr',
  'tag',
  'bell',
  'lock',
  'list',
  'archive',
  'crop',
  'map-pin',
  'play',
  'panel-left',
];

describe('Icon', () => {
  it('is part of the public kit', () => {
    expect(ui.Icon).toBe(Icon);
  });

  it('draws every named icon as a stroked 24px glyph', () => {
    for (const name of NAMES) {
      const html = renderToStaticMarkup(<Icon name={name} />);

      expect(html, name).toContain('viewBox="0 0 24 24"');
      expect(html, name).toContain('stroke="currentColor"');
      expect(html, name).toContain('width="20"');
      expect(html, name).toMatch(/<(path|rect|circle|ellipse)/);
    }
  });

  it('is hidden from screen readers unless it is given a name', () => {
    expect(renderToStaticMarkup(<Icon name="search" />)).toContain('aria-hidden="true"');

    const named = renderToStaticMarkup(<Icon name="search" label="ค้นหา" />);
    expect(named).toContain('role="img"');
    expect(named).toContain('<title>ค้นหา</title>');
    expect(named).not.toContain('aria-hidden');
  });

  it('honours an explicit size so toolbars stay aligned with 16px text', () => {
    expect(renderToStaticMarkup(<Icon name="plus" size={16} />)).toContain('width="16"');
  });
});
