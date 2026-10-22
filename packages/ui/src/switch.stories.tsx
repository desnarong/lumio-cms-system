import type { Meta, StoryObj } from '@storybook/react-vite';
import { Switch } from './switch.js';

const meta = {
  title: 'Forms/Switch',
  component: Switch,
  tags: ['autodocs'],
  args: {
    id: 'publish',
    label: 'เผยแพร่ทันที',
    description: 'ลูกค้าจะเห็นหน้านี้ทันทีที่บันทึก',
    onChange: () => {},
  },
} satisfies Meta<typeof Switch>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Off: Story = {};

export const On: Story = {
  args: { defaultChecked: true },
};

export const Disabled: Story = {
  args: { disabled: true },
};
