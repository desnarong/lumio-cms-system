import { useState } from 'react';
import type { Meta, StoryObj } from '@storybook/react-vite';
import { Pagination } from './pagination.js';

const meta = {
  title: 'Navigation/Pagination',
  component: Pagination,
  tags: ['autodocs'],
  args: {
    page: 1,
    totalPages: 8,
    onChange: () => {},
  },
} satisfies Meta<typeof Pagination>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {};

export const MiddlePage: Story = {
  args: { page: 10, totalPages: 20 },
};

const PaginationDemo = () => {
  const [page, setPage] = useState(3);
  return <Pagination page={page} totalPages={12} onChange={setPage} />;
};

export const Interactive: Story = {
  render: () => <PaginationDemo />,
};
