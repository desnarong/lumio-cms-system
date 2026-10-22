import type { Meta, StoryObj } from '@storybook/react-vite';
import { Progress } from './progress.js';

const meta = {
  title: 'Feedback/Progress',
  component: Progress,
  tags: ['autodocs'],
  decorators: [
    (Story) => (
      <div style={{ width: 320 }}>
        <Story />
      </div>
    ),
  ],
  args: {
    value: 40,
    max: 100,
    label: 'กำลังอัปโหลด',
  },
} satisfies Meta<typeof Progress>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {};

export const Complete: Story = {
  args: { value: 100, tone: 'success' },
};

export const Danger: Story = {
  args: { value: 90, tone: 'danger' },
};

export const Indeterminate: Story = {
  args: { indeterminate: true },
};
