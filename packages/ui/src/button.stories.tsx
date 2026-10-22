import type { Meta, StoryObj } from '@storybook/react-vite';
import { Button } from './button.js';

const meta = {
  title: 'Actions/Button',
  component: Button,
  tags: ['autodocs'],
  parameters: {
    docs: {
      description: {
        component: 'ปุ่มมาตรฐานของ Lumio ใช้ Primary ได้ไม่เกิน 1 ปุ่มต่อหน้า',
      },
    },
  },
  args: {
    children: 'บันทึก',
    onClick: () => {},
  },
} satisfies Meta<typeof Button>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Primary: Story = {};

export const Secondary: Story = {
  args: { variant: 'secondary', children: 'ยกเลิก' },
};

export const Ghost: Story = {
  args: { variant: 'ghost', children: 'ดูตัวอย่าง' },
};

export const Danger: Story = {
  args: { variant: 'danger', children: 'ลบหน้า' },
};

export const Sizes: Story = {
  render: (args) => (
    <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-md)' }}>
      <Button {...args} size="sm">
        เล็ก
      </Button>
      <Button {...args} size="md">
        กลาง
      </Button>
      <Button {...args} size="lg">
        ใหญ่
      </Button>
    </div>
  ),
};

export const Disabled: Story = {
  args: { disabled: true, children: 'กำลังบันทึก…' },
};
