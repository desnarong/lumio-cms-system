import type { Meta, StoryObj } from '@storybook/react-vite';
import { Button } from './button.js';
import { Popover } from './popover.js';

const meta = {
  title: 'Overlay/Popover',
  component: Popover,
  tags: ['autodocs'],
  args: {
    trigger: '⋯',
    triggerLabel: 'ตัวเลือกเพิ่มเติม',
    children: (
      <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-sm)' }}>
        <Button variant="ghost" size="sm">
          ทำสำเนา
        </Button>
        <Button variant="ghost" size="sm">
          ย้ายไปถังขยะ
        </Button>
      </div>
    ),
  },
} satisfies Meta<typeof Popover>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Closed: Story = {};

export const Open: Story = {
  args: { defaultOpen: true, align: 'end' },
};
