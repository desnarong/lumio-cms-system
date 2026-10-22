import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import { MenusPanel } from './MenusPanel.js';
import type { DesignApi } from './api.js';

/**
 * The panel only reads the API inside effects, so a static render shows the
 * loading state plus the controls around it: exactly what these checks need
 * (which language tabs exist, and what the panel says about them).
 */
const api = {} as DesignApi;

const render = (locales?: string[]): string =>
  renderToStaticMarkup(<MenusPanel api={api} locales={locales} />);

describe('MenusPanel languages', () => {
  it('offers a menu per language plus the shared one', () => {
    const html = render(['th', 'en']);

    expect(html).toContain('ใช้ร่วมทุกภาษา');
    expect(html).toContain('ไทย');
    expect(html).toContain('English');
    expect(html).toContain('เมนูด้านบน');
  });

  it('stays out of the way for a single-language site', () => {
    const html = render(['th']);

    expect(html).not.toContain('ใช้ร่วมทุกภาษา');
    expect(html).toContain('เมนูด้านบน');
  });

  it('works with no locale information at all', () => {
    expect(render()).toContain('เมนูนำทาง'.slice(0, 0) + 'เมนูด้านล่าง');
  });
});