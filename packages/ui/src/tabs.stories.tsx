import type { Meta, StoryObj } from '@storybook/react-vite';
import { Tabs } from './tabs.js';

const meta = {
  title: 'Navigation/Tabs',
  component: Tabs,
  tags: ['autodocs'],
  args: {
    items: [
      { id: 'content', label: 'เนื้อหา', content: 'แก้ไขข้อความและรูปภาพของหน้า' },
      { id: 'seo', label: 'SEO', content: 'ตั้งค่าหัวข้อและคำอธิบายสำหรับเสิร์ชเอนจิน' },
      { id: 'share', label: 'แชร์', content: 'รูปและข้อความเมื่อแชร์ลิงก์', badge: 'ใหม่' },
    ],
  },
} satisfies Meta<typeof Tabs>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {};

export const SecondTabActive: Story = {
  args: { value: 'seo' },
};
