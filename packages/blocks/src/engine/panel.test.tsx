import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import { PanelAccordion, PanelSection } from './panel.js';

const renderAccordion = (): string =>
  renderToStaticMarkup(
    <PanelAccordion>
      <PanelSection title="เนื้อหา">
        <span>ช่องข้อความ</span>
      </PanelSection>
      <PanelSection title="หน้าตา">
        <span>ช่องสี</span>
      </PanelSection>
    </PanelAccordion>,
  );

describe('PanelAccordion', () => {
  it('opens the first group and folds the rest', () => {
    const html = renderAccordion();
    expect(html).toContain('ขยายทั้งหมด');
    expect(html).toContain('ย่อทั้งหมด');
    expect(html).toContain('aria-expanded="true"');
    expect(html).toContain('aria-expanded="false"');
  });

  it('keeps folded controls mounted so their values survive folding', () => {
    const html = renderAccordion();
    expect(html).toContain('ช่องข้อความ');
    expect(html).toContain('ช่องสี');
    expect(html).toContain('hidden=""');
  });
});
