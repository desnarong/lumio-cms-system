import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import { Breadcrumb } from './breadcrumb.js';
import { Pagination } from './pagination.js';
import { Sidebar } from './sidebar.js';
import { Tabs } from './tabs.js';

describe('Tabs', () => {
  it('marks the first tab active by default and renders its panel', () => {
    const html = renderToStaticMarkup(
      <Tabs
        items={[
          { id: 'content', label: 'เนื้อหา', content: 'แก้ไขเนื้อหา' },
          { id: 'seo', label: 'SEO', content: 'ตั้งค่า SEO' },
        ]}
      />,
    );
    expect(html).toContain('role="tablist"');
    expect(html.match(/aria-selected="true"/g)?.length).toBe(1);
    expect(html).toContain('แก้ไขเนื้อหา');
    expect(html).not.toContain('ตั้งค่า SEO');
  });

  it('honours a controlled value', () => {
    const html = renderToStaticMarkup(
      <Tabs
        value="seo"
        items={[
          { id: 'content', label: 'เนื้อหา', content: 'แก้ไขเนื้อหา' },
          { id: 'seo', label: 'SEO', content: 'ตั้งค่า SEO' },
        ]}
      />,
    );
    expect(html).toContain('ตั้งค่า SEO');
    expect(html).not.toContain('แก้ไขเนื้อหา');
  });
});

describe('Breadcrumb', () => {
  it('links intermediate items and marks the last as current', () => {
    const html = renderToStaticMarkup(
      <Breadcrumb items={[{ label: 'หน้าแรก', href: '/' }, { label: 'บริการ' }]} />,
    );
    expect(html).toContain('aria-label="เส้นทางนำทาง"');
    expect(html).toContain('href="/"');
    expect(html).toContain('aria-current="page"');
  });
});

describe('Pagination', () => {
  it('renders nothing for a single page', () => {
    expect(renderToStaticMarkup(<Pagination page={1} totalPages={1} onChange={() => {}} />)).toBe(
      '',
    );
  });

  it('marks the active page and disables the edges', () => {
    const html = renderToStaticMarkup(<Pagination page={1} totalPages={5} onChange={() => {}} />);
    expect(html).toContain('aria-current="page"');
    expect(html).toContain('ก่อนหน้า');
    expect(html).toContain('ถัดไป');
    expect(html).toContain('disabled');
  });

  it('collapses long ranges with an ellipsis', () => {
    const html = renderToStaticMarkup(<Pagination page={10} totalPages={20} onChange={() => {}} />);
    expect(html).toContain('ui-pagination__ellipsis');
  });
});

describe('Sidebar', () => {
  it('marks the active item and renders badges', () => {
    const html = renderToStaticMarkup(
      <Sidebar
        items={[
          { id: 'pages', label: 'หน้าเว็บ', href: '/pages', active: true },
          { id: 'inbox', label: 'ข้อความ', badge: '3' },
        ]}
      />,
    );
    expect(html).toContain('aria-label="เมนูหลัก"');
    expect(html).toContain('href="/pages"');
    expect(html).toContain('aria-current="page"');
    expect(html).toContain('ui-sidebar__badge');
  });

  it('collapses to an icon strip', () => {
    const html = renderToStaticMarkup(
      <Sidebar collapsed items={[{ id: 'pages', label: 'หน้าเว็บ', icon: '▤' }]} />,
    );
    expect(html).toContain('ui-sidebar--collapsed');
  });
});
