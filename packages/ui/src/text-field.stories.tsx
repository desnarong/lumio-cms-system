import type { Meta, StoryObj } from '@storybook/react-vite';
import { TextField } from './text-field.js';

const meta = {
  title: 'Forms/TextField',
  component: TextField,
  tags: ['autodocs'],
  args: {
    id: 'site-name',
    label: 'ชื่อเว็บไซต์',
    placeholder: 'เช่น กาแฟบ้านดอย',
  },
} satisfies Meta<typeof TextField>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {};

export const WithHint: Story = {
  args: { hint: 'ชื่อนี้จะแสดงบนหัวเว็บไซต์' },
};

export const WithError: Story = {
  args: { error: 'ต้องกรอกชื่อเว็บไซต์' },
};

export const Required: Story = {
  args: { required: true },
};

export const Disabled: Story = {
  args: { disabled: true, defaultValue: 'กาแฟบ้านดอย' },
};
