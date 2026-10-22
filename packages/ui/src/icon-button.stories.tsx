import type { Meta, StoryObj } from '@storybook/react-vite';
import { Icon } from './icon.js';
import { IconButton } from './icon-button.js';

const meta = {
  title: 'Actions/IconButton',
  component: IconButton,
  tags: ['autodocs'],
  args: {
    'aria-label': 'ลบ',
    children: <Icon name="trash" size={18} />,
    onClick: () => {},
  },
} satisfies Meta<typeof IconButton>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Ghost: Story = {};

export const Secondary: Story = {
  args: { variant: 'secondary', 'aria-label': 'แก้ไข', children: <Icon name="pen" size={18} /> },
};

export const Danger: Story = {
  args: { variant: 'danger', 'aria-label': 'ลบ', children: <Icon name="trash" size={18} /> },
};
