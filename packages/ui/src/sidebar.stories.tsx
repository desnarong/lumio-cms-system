import type { Meta, StoryObj } from '@storybook/react-vite';
import { Sidebar } from './sidebar.js';

const meta = {
  title: 'Navigation/Sidebar',
  component: Sidebar,
  tags: ['autodocs'],
  decorators: [
    (Story) => (
      <div style={{ height: 480, display: 'flex' }}>
        <Story />
      </div>
    ),
  ],
  args: {
    items: [
      { id: 'dashboard', label: 'ภาพรวม', icon: '▤', href: '/dashboard' },
      { id: 'pages', label: 'หน้าเว็บ', icon: '❐', href: '/pages', active: true },
      { id: 'media', label: 'รูปภาพ', icon: '🖼', href: '/media' },
      { id: 'forms', label: 'ข้อความ', icon: '✉', href: '/inbox', badge: '3' },
      { id: 'settings', label: 'ตั้งค่า', icon: '⚙', href: '/settings' },
    ],
  },
} satisfies Meta<typeof Sidebar>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Expanded: Story = {};

export const Collapsed: Story = {
  args: { collapsed: true },
};
