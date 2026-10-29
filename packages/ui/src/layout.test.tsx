import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import { Button } from './button.js';
import { PageHeader } from './page-header.js';
import { Tabs } from './tabs.js';

describe('PageHeader', () => {
  it('names the screen with one heading and a plain description', () => {
    const html = renderToStaticMarkup(
      <PageHeader title="หน้าเว็บ" description="ทุกหน้าของเว็บไซต์นี้" />,
    );

    expect(html.match(/<h1/g)).toHaveLength(1);
    expect(html).toContain('ui-page-header__title');
    expect(html).toContain('ทุกหน้าของเว็บไซต์นี้');
  });

  it('renders only the slots the screen fills, so no empty boxes are left', () => {
    const bare = renderToStaticMarkup(<PageHeader title="ภาพรวม" />);

    expect(bare).not.toContain('ui-page-header__actions');
    expect(bare).not.toContain('ui-page-header__eyebrow');
    expect(bare).not.toContain('ui-page-header__tabs');
    expect(bare).not.toContain('ui-page-header__meta');
  });

  it('puts the actions of the screen on the right of the title row', () => {
    const html = renderToStaticMarkup(
      <PageHeader
        eyebrow="เนื้อหา"
        title="หน้าเว็บ"
        actions={
          <>
            <Button variant="secondary">นำเข้า</Button>
            <Button variant="primary">เพิ่มหน้าใหม่</Button>
          </>
        }
      />,
    );

    expect(html).toContain('ui-page-header__eyebrow');
    expect(html).toContain('ui-page-header__actions');
    expect(html).toContain('เพิ่มหน้าใหม่');
    expect(html.match(/ui-button--primary/g)).toHaveLength(1);
  });

  it('counts the work next to the title instead of in a separate card', () => {
    const html = renderToStaticMarkup(
      <PageHeader title="ฟอร์ม & ข้อความ" meta={<span className="chip">3 ใหม่</span>} />,
    );

    expect(html).toContain('ui-page-header__meta');
    expect(html).toContain('3 ใหม่');
  });

  it('keeps sub-navigation of the screen under the title', () => {
    const html = renderToStaticMarkup(
      <PageHeader
        title="ดีไซน์"
        tabs={<Tabs value="style" items={[{ id: 'style', label: 'สไตล์' }]} />}
      />,
    );

    expect(html).toContain('ui-page-header__tabs');
    expect(html).toContain('role="tablist"');
    expect(html.indexOf('ui-page-header__row')).toBeLessThan(html.indexOf('ui-page-header__tabs'));
  });

  it('steps down to h2 when another landmark already owns the page title', () => {
    const html = renderToStaticMarkup(<PageHeader as="h2" title="ประวัติเวอร์ชัน" />);

    expect(html).toContain('<h2');
    expect(html).not.toContain('<h1');
  });
});
