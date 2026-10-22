import { useState } from 'react';
import type { Meta, StoryObj } from '@storybook/react-vite';
import { Button } from './button.js';
import { Modal } from './modal.js';

const meta = {
  title: 'Overlay/Modal',
  component: Modal,
  tags: ['autodocs'],
  args: {
    open: false,
    title: 'ลบหน้านี้?',
    description: 'การลบนี้ยกเลิกได้ภายใน 30 วินาที',
    children: 'หน้า บริการ และเนื้อหาทั้งหมดจะถูกย้ายไปถังขยะ',
  },
} satisfies Meta<typeof Modal>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Closed: Story = {};

const ModalDemo = () => {
  const [open, setOpen] = useState(true);
  return (
    <>
      <Button onClick={() => setOpen(true)}>เปิดหน้าต่าง</Button>
      <Modal
        open={open}
        title="ลบหน้านี้?"
        description="การลบนี้ยกเลิกได้ภายใน 30 วินาที"
        onClose={() => setOpen(false)}
        footer={
          <>
            <Button variant="secondary" onClick={() => setOpen(false)}>
              ยกเลิก
            </Button>
            <Button variant="danger" onClick={() => setOpen(false)}>
              ลบหน้า
            </Button>
          </>
        }
      >
        หน้า บริการ และเนื้อหาทั้งหมดจะถูกย้ายไปถังขยะ
      </Modal>
    </>
  );
};

export const Open: Story = {
  render: () => <ModalDemo />,
};
