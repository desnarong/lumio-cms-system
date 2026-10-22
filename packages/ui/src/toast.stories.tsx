import type { Meta, StoryObj } from '@storybook/react-vite';
import { Button } from './button.js';
import { Toast, ToastProvider, useToast } from './toast.js';

const meta = {
  title: 'Feedback/Toast',
  component: Toast,
  tags: ['autodocs'],
  args: {
    title: 'บันทึกแล้ว',
    description: 'การเปลี่ยนแปลงมีผลทันที',
    onDismiss: () => {},
  },
} satisfies Meta<typeof Toast>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Info: Story = {};

export const Success: Story = {
  args: { tone: 'success', title: 'เผยแพร่แล้ว' },
};

export const WithUndo: Story = {
  args: {
    tone: 'danger',
    title: 'ลบหน้าแล้ว',
    description: 'ลบหน้า บริการ เรียบร้อย',
    action: { label: 'เลิกทำ' },
  },
};

const ToastPlayground = () => {
  const { push } = useToast();
  return (
    <div style={{ display: 'flex', gap: 'var(--space-sm)' }}>
      <Button
        variant="secondary"
        onClick={() =>
          push({
            tone: 'danger',
            title: 'ลบหน้าแล้ว',
            description: 'ลบหน้า บริการ เรียบร้อย',
            undo: { onClick: () => push({ tone: 'success', title: 'กู้คืนแล้ว' }) },
          })
        }
      >
        ลบหน้า
      </Button>
      <Button onClick={() => push({ tone: 'success', title: 'บันทึกแล้ว' })}>บันทึก</Button>
    </div>
  );
};

export const Provider: Story = {
  render: () => (
    <ToastProvider>
      <ToastPlayground />
    </ToastProvider>
  ),
};
