import type { Meta, StoryObj } from '@storybook/react-vite';
import { Button } from './button.js';
import { PageHeader } from './page-header.js';
import { Tabs } from './tabs.js';

const meta = {
  title: 'Layout/PageHeader',
  component: PageHeader,
  tags: ['autodocs'],
  args: {
    eyebrow: 'เนื้อหา',
    title: 'หน้าเว็บ',
    description: 'ทุกหน้าที่อยู่ในเว็บไซต์นี้ แก้ไขหรือเพิ่มหน้าใหม่ได้ทันที',
  },
} satisfies Meta<typeof PageHeader>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {};

export const WithOnePrimaryAction: Story = {
  args: {
    actions: (
      <>
        <Button variant="secondary">นำเข้า</Button>
        <Button variant="primary">เพิ่มหน้าใหม่</Button>
      </>
    ),
  },
};

export const WithMeta: Story = {
  args: {
    meta: (
      <>
        <span className="chip">12 หน้า</span>
        <span className="chip chip--warning">3 ร่าง</span>
      </>
    ),
  },
};

export const WithTabs: Story = {
  args: {
    tabs: (
      <Tabs
        items={[
          { id: 'style', label: 'สไตล์' },
          { id: 'menus', label: 'เมนูนำทาง' },
        ]}
        value="style"
      />
    ),
  },
};
