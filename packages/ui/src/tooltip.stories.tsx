import type { Meta, StoryObj } from '@storybook/react-vite';
import { Button } from './button.js';
import { Tooltip } from './tooltip.js';

const meta = {
  title: 'Overlay/Tooltip',
  component: Tooltip,
  tags: ['autodocs'],
  args: {
    content: 'บันทึกทันที (Ctrl+S)',
    children: <Button>บันทึก</Button>,
    placement: 'top',
  },
} satisfies Meta<typeof Tooltip>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Top: Story = {};

export const Bottom: Story = {
  args: { placement: 'bottom' },
};
