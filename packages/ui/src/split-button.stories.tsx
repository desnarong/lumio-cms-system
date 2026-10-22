import type { Meta, StoryObj } from '@storybook/react-vite';
import { SplitButton } from './split-button.js';

const meta = {
  title: 'Actions/SplitButton',
  component: SplitButton,
  tags: ['autodocs'],
  args: {
    children: 'เผยแพร่',
    onClick: () => {},
    actions: [{ label: 'บันทึกร่าง' }, { label: 'ตั้งเวลาเผยแพร่' }, { label: 'ดูตัวอย่าง' }],
  },
} satisfies Meta<typeof SplitButton>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {};

export const Secondary: Story = {
  args: { variant: 'secondary', children: 'ตัวเลือก' },
};
