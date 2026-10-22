import type { Meta, StoryObj } from '@storybook/react-vite';
import { Button } from './button.js';
import { EmptyState } from './empty-state.js';

const meta = {
  title: 'Feedback/EmptyState',
  component: EmptyState,
  tags: ['autodocs'],
  args: {
    title: 'ยังไม่มีหน้าเว็บ',
    description: 'เริ่มจากเทมเพลตสำเร็จรูปได้ในไม่กี่นาที',
  },
} satisfies Meta<typeof EmptyState>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {};

export const WithAction: Story = {
  args: {
    action: <Button>สร้างหน้าแรก</Button>,
  },
};

export const Error: Story = {
  args: {
    tone: 'error',
    title: 'โหลดข้อมูลไม่สำเร็จ',
    description: 'ลองอีกครั้งได้เลย ข้อมูลของคุณยังอยู่ครบ',
    action: (
      <Button variant="secondary" size="sm">
        ลองใหม่
      </Button>
    ),
  },
};
