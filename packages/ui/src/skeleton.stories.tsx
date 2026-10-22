import type { Meta, StoryObj } from '@storybook/react-vite';
import { Skeleton } from './skeleton.js';

const meta = {
  title: 'Feedback/Skeleton',
  component: Skeleton,
  tags: ['autodocs'],
  args: {
    shape: 'text',
    lines: 3,
  },
} satisfies Meta<typeof Skeleton>;

export default meta;
type Story = StoryObj<typeof meta>;

export const TextLines: Story = {};

export const Block: Story = {
  args: { shape: 'block', lines: 1, width: 320, height: 160 },
};

export const Circle: Story = {
  args: { shape: 'circle', lines: 1, width: 48, height: 48 },
};
