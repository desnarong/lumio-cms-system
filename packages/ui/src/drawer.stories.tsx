import { useState } from 'react';
import type { Meta, StoryObj } from '@storybook/react-vite';
import { Button } from './button.js';
import { Drawer } from './drawer.js';

const meta = {
  title: 'Overlay/Drawer',
  component: Drawer,
  tags: ['autodocs'],
  args: {
    open: false,
    title: 'ตั้งค่า Hero',
    children: 'ตัวเลือกของบล็อกจะแสดงที่นี่',
  },
} satisfies Meta<typeof Drawer>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Closed: Story = {};

const DrawerDemo = () => {
  const [open, setOpen] = useState(true);
  return (
    <>
      <Button onClick={() => setOpen(true)}>เปิดแผงตั้งค่า</Button>
      <Drawer
        open={open}
        title="ตั้งค่า Hero"
        onClose={() => setOpen(false)}
        footer={
          <Button variant="secondary" onClick={() => setOpen(false)}>
            เสร็จสิ้น
          </Button>
        }
      >
        ตัวเลือกของบล็อกจะแสดงที่นี่
      </Drawer>
    </>
  );
};

export const Open: Story = {
  render: () => <DrawerDemo />,
};
