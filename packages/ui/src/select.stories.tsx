import type { Meta, StoryObj } from '@storybook/react-vite';
import { Select } from './select.js';

const meta = {
  title: 'Forms/Select',
  component: Select,
  tags: ['autodocs'],
  args: {
    id: 'template',
    label: 'เทมเพลต',
    placeholder: 'เลือกเทมเพลต',
    options: [
      { value: 'cafe', label: 'ร้านกาแฟ' },
      { value: 'clinic', label: 'คลินิก' },
      { value: 'restaurant', label: 'ร้านอาหาร' },
    ],
  },
} satisfies Meta<typeof Select>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {};

export const WithError: Story = {
  args: { error: 'กรุณาเลือกเทมเพลต' },
};
