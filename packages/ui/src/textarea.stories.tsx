import type { Meta, StoryObj } from '@storybook/react-vite';
import { Textarea } from './textarea.js';

const meta = {
  title: 'Forms/Textarea',
  component: Textarea,
  tags: ['autodocs'],
  args: {
    id: 'about',
    label: 'เกี่ยวกับร้าน',
    placeholder: 'เล่าเรื่องร้านของคุณสั้น ๆ',
    rows: 5,
  },
} satisfies Meta<typeof Textarea>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {};

export const WithError: Story = {
  args: { error: 'ข้อความยาวเกิน 500 ตัวอักษร' },
};
