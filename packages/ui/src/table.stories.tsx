import type { Meta, StoryObj } from '@storybook/react-vite';
import { Button } from './button.js';
import { DataTable, type Column } from './table.js';

interface PageRow {
  id: string;
  title: string;
  status: string;
  views: number;
}

const rows: PageRow[] = [
  { id: '1', title: 'หน้าแรก', status: 'เผยแพร่', views: 1200 },
  { id: '2', title: 'บริการ', status: 'เผยแพร่', views: 340 },
  { id: '3', title: 'บทความ', status: 'ฉบับร่าง', views: 0 },
];

const columns: Column<PageRow>[] = [
  { key: 'title', header: 'ชื่อหน้า', sortable: true },
  { key: 'status', header: 'สถานะ', sortable: true },
  { key: 'views', header: 'ผู้เข้าชม', align: 'end', sortable: true, value: (row) => row.views },
];

const meta = {
  title: 'Data/DataTable',
  component: DataTable,
  tags: ['autodocs'],
  args: {
    columns,
    rows,
    rowKey: (row: PageRow) => row.id,
    searchable: true,
  },
} satisfies Meta<typeof DataTable<PageRow>>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {};

export const Loading: Story = {
  args: { loading: true },
};

export const Empty: Story = {
  args: {
    rows: [],
    emptyTitle: 'ยังไม่มีหน้าเว็บ',
    emptyDescription: 'เริ่มสร้างหน้าแรกได้เลย',
    emptyAction: <Button>สร้างหน้าแรก</Button>,
  },
};

export const Error: Story = {
  args: { error: 'โหลดข้อมูลไม่สำเร็จ', onRetry: () => {} },
};
