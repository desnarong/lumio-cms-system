import type { Meta, StoryObj } from '@storybook/react-vite';
import { Banner } from './banner.js';

const meta = {
  title: 'Feedback/Banner',
  component: Banner,
  tags: ['autodocs'],
  args: {
    tone: 'info',
    title: 'ยังไม่ได้เผยแพร่',
    children: 'กดเผยแพร่เพื่อให้ลูกค้าเห็นหน้าเว็บนี้',
  },
} satisfies Meta<typeof Banner>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Info: Story = {};

export const Success: Story = {
  args: { tone: 'success', title: 'บันทึกแล้ว', children: 'การเปลี่ยนแปลงมีผลทันที' },
};

export const Warning: Story = {
  args: { tone: 'warning', title: 'ยังไม่ได้ตั้งค่าโดเมน' },
};

export const Danger: Story = {
  args: { tone: 'danger', title: 'อัปโหลดรูปไม่สำเร็จ', children: 'ไฟล์ต้องมีขนาดไม่เกิน 5 MB' },
};

export const Dismissible: Story = {
  args: { onDismiss: () => {} },
};
