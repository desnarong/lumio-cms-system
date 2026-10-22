import type { Meta, StoryObj } from '@storybook/react-vite';
import { Breadcrumb } from './breadcrumb.js';

const meta = {
  title: 'Navigation/Breadcrumb',
  component: Breadcrumb,
  tags: ['autodocs'],
  args: {
    items: [
      { label: 'หน้าแรก', href: '/' },
      { label: 'หน้าเว็บ', href: '/pages' },
      { label: 'บริการ' },
    ],
  },
} satisfies Meta<typeof Breadcrumb>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {};

export const TwoLevels: Story = {
  args: { items: [{ label: 'หน้าแรก', href: '/' }, { label: 'ตั้งค่า' }] },
};
