import type { Meta, StoryObj } from '@storybook/react-vite';
import { Icon } from './icon.js';
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
      {
        id: 'dashboard',
        label: 'ภาพรวม',
        icon: <Icon name="home" size={18} />,
        href: '/dashboard',
      },
      {
        id: 'pages',
        label: 'หน้าเว็บ',
        icon: <Icon name="file-text" size={18} />,
        href: '/pages',
        active: true,
      },
      { id: 'media', label: 'รูปภาพ', icon: <Icon name="image" size={18} />, href: '/media' },
      {
        id: 'forms',
        label: 'ข้อความ',
        icon: <Icon name="mail" size={18} />,
        href: '/inbox',
        badge: '3',
      },
      {
        id: 'settings',
        label: 'ตั้งค่า',
        icon: <Icon name="settings" size={18} />,
        href: '/settings',
      },
    ],
  },
} satisfies Meta<typeof Sidebar>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Expanded: Story = {};

export const Collapsed: Story = {
  args: { collapsed: true },
};
