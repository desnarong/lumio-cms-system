import type { Meta, StoryObj } from '@storybook/react-vite';
import { ImagePicker } from './image-picker.js';

const meta = {
  title: 'Forms/ImagePicker',
  component: ImagePicker,
  tags: ['autodocs'],
  args: {
    id: 'hero-image',
    label: 'ภาพหลัก',
    alt: 'ภาพร้านกาแฟ',
    onChange: () => {},
  },
} satisfies Meta<typeof ImagePicker>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Empty: Story = {};

export const WithImage: Story = {
  args: {
    value: 'https://placehold.co/480x240/6366F1/FFFFFF?text=Lumio',
  },
};

export const Square: Story = {
  args: {
    aspect: 'square',
    value: 'https://placehold.co/240x240/F472B6/FFFFFF?text=Logo',
  },
};
