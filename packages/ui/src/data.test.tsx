import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import { IconButton } from './icon-button.js';
import { SplitButton } from './split-button.js';
import { StatCard } from './stat-card.js';
import { DataTable, type Column } from './table.js';

interface PageRow {
  id: string;
  title: string;
  views: number;
}

const columns: Column<PageRow>[] = [
  { key: 'title', header: 'ชื่อหน้า', sortable: true },
  { key: 'views', header: 'ผู้เข้าชม', align: 'end', value: (row) => row.views },
];

const rows: PageRow[] = [
  { id: '1', title: 'หน้าแรก', views: 1200 },
  { id: '2', title: 'บริการ', views: 340 },
];

describe('DataTable', () => {
  it('renders headers and rows', () => {
    const html = renderToStaticMarkup(
      <DataTable columns={columns} rows={rows} rowKey={(row) => row.id} />,
    );
    expect(html).toContain('<table');
    expect(html).toContain('ชื่อหน้า');
    expect(html).toContain('หน้าแรก');
    expect(html).toContain('บริการ');
    expect(html).toContain('ui-table__cell--end');
  });

  it('adds a search box when searchable', () => {
    const html = renderToStaticMarkup(
      <DataTable columns={columns} rows={rows} rowKey={(row) => row.id} searchable />,
    );
    expect(html).toContain('type="search"');
    expect(html).toContain('ui-table__search');
  });

  it('exposes sortable headers', () => {
    const html = renderToStaticMarkup(
      <DataTable columns={columns} rows={rows} rowKey={(row) => row.id} />,
    );
    expect(html).toContain('ui-table__sort');
  });

  it('shows the empty state when there are no rows', () => {
    const html = renderToStaticMarkup(
      <DataTable
        columns={columns}
        rows={[]}
        rowKey={(row) => row.id}
        emptyTitle="ยังไม่มีหน้าเว็บ"
        emptyDescription="เริ่มสร้างหน้าแรกได้เลย"
      />,
    );
    expect(html).toContain('ui-empty-state');
    expect(html).toContain('ยังไม่มีหน้าเว็บ');
    expect(html).not.toContain('<table');
  });

  it('shows a skeleton while loading', () => {
    const html = renderToStaticMarkup(
      <DataTable columns={columns} rows={rows} rowKey={(row) => row.id} loading />,
    );
    expect(html).toContain('ui-table__loading');
    expect(html).toContain('ui-skeleton');
    expect(html).not.toContain('<table');
  });

  it('shows an error state with a retry action', () => {
    const html = renderToStaticMarkup(
      <DataTable
        columns={columns}
        rows={rows}
        rowKey={(row) => row.id}
        error="โหลดข้อมูลไม่สำเร็จ"
        onRetry={() => {}}
      />,
    );
    expect(html).toContain('ui-empty-state--error');
    expect(html).toContain('โหลดข้อมูลไม่สำเร็จ');
    expect(html).toContain('ลองใหม่');
  });
});

describe('StatCard', () => {
  it('renders the value and trend direction', () => {
    const html = renderToStaticMarkup(
      <StatCard
        label="ผู้เข้าชมวันนี้"
        value="1,240"
        delta="+12%"
        trend="up"
        hint="เทียบกับเมื่อวาน"
      />,
    );
    expect(html).toContain('ผู้เข้าชมวันนี้');
    expect(html).toContain('1,240');
    expect(html).toContain('ui-stat-card__delta--up');
    expect(html).toContain('เทียบกับเมื่อวาน');
  });
});

describe('IconButton', () => {
  it('requires and renders an accessible label', () => {
    const html = renderToStaticMarkup(<IconButton aria-label="ลบ">🗑</IconButton>);
    expect(html).toContain('aria-label="ลบ"');
    expect(html).toContain('ui-button--icon');
  });
});

describe('SplitButton', () => {
  it('keeps the menu hidden until opened', () => {
    const html = renderToStaticMarkup(
      <SplitButton actions={[{ label: 'บันทึกร่าง' }]}>เผยแพร่</SplitButton>,
    );
    expect(html).toContain('aria-expanded="false"');
    expect(html).toContain('เผยแพร่');
    expect(html).not.toContain('ui-split-button__menu');
  });
});
