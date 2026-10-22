import type { Meta, StoryObj } from '@storybook/react-vite';
import { StatCard } from './stat-card.js';

const meta = {
  title: 'Data/StatCard',
  component: StatCard,
  tags: ['autodocs'],
  args: {
    label: 'ผู้เข้าชมวันนี้',
    value: '1,240',
    delta: '+12%',
    trend: 'up',
    hint: 'เทียบกับเมื่อวาน',
  },
} satisfies Meta<typeof StatCard>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Up: Story = {};

export const Down: Story = {
  args: { label: 'ฟอร์มที่ยังไม่อ่าน', value: '3', delta: '-25%', trend: 'down' },
};

export const Flat: Story = {
  args: { label: 'หน้าทั้งหมด', value: '12', trend: 'flat', delta: undefined },
};
