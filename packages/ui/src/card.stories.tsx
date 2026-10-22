import type { Meta, StoryObj } from '@storybook/react-vite';
import { Card } from './card.js';

const meta = {
  title: 'Data/Card',
  component: Card,
  tags: ['autodocs'],
  args: {
    children: 'เนื้อหาการ์ด',
  },
} satisfies Meta<typeof Card>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {};

export const WithContent: Story = {
  render: (args) => (
    <Card {...args}>
      <h3 style={{ margin: 0, fontFamily: 'var(--font-display)', color: 'var(--color-text)' }}>
        กาแฟบ้านดอย
      </h3>
      <p style={{ color: 'var(--color-text-muted)' }}>กาแฟคั่วสดจากดอยเชียงใหม่</p>
    </Card>
  ),
};
