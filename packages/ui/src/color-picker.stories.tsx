import type { Meta, StoryObj } from '@storybook/react-vite';
import { ColorPicker } from './color-picker.js';

const meta = {
  title: 'Forms/ColorPicker',
  component: ColorPicker,
  tags: ['autodocs'],
  args: {
    id: 'brand',
    label: 'สีหลักของเว็บ',
    defaultValue: '#6366F1',
    presets: ['#6366F1', '#F472B6', '#10B981', '#F59E0B', '#0F172A'],
    onChange: () => {},
  },
} satisfies Meta<typeof ColorPicker>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {};

export const Invalid: Story = {
  args: { error: 'รหัสสีไม่ถูกต้อง' },
};
