import type { Meta, StoryObj } from '@storybook/react-vite';
import { Slider } from './slider.js';

const meta = {
  title: 'Forms/Slider',
  component: Slider,
  tags: ['autodocs'],
  args: {
    id: 'spacing',
    label: 'ระยะห่างบน-ล่าง',
    min: 0,
    max: 64,
    step: 8,
    defaultValue: 24,
    onChange: () => {},
  },
} satisfies Meta<typeof Slider>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {};

export const WithUnit: Story = {
  args: { formatValue: (value: number) => `${value}px` },
};
