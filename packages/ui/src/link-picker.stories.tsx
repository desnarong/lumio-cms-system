import type { Meta, StoryObj } from '@storybook/react-vite';
import { LinkPicker } from './link-picker.js';

const meta = {
  title: 'Forms/LinkPicker',
  component: LinkPicker,
  tags: ['autodocs'],
  args: {
    id: 'cta-link',
    label: 'ลิงก์ปุ่ม',
    value: '/ติดต่อ',
    onChange: () => {},
    onExternalChange: () => {},
  },
} satisfies Meta<typeof LinkPicker>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {};

export const WithPagePicker: Story = {
  args: { onPickPage: () => {} },
};

export const External: Story = {
  args: { external: true, value: 'https://lumio.dev' },
};
