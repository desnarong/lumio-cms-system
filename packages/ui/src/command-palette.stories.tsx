import { useState } from 'react';
import type { Meta, StoryObj } from '@storybook/react-vite';
import { Button } from './button.js';
import { CommandPalette, type CommandPaletteSection } from './command-palette.js';

const sections: CommandPaletteSection[] = [
  {
    id: 'goto',
    label: 'ไปที่',
    items: [
      { id: 'dashboard', label: 'ภาพรวม' },
      { id: 'pages', label: 'หน้าเว็บ' },
      { id: 'settings', label: 'ตั้งค่า' },
    ],
  },
  {
    id: 'action',
    label: 'ทำอะไร',
    items: [
      { id: 'new-page', label: 'เพิ่มหน้าใหม่' },
      { id: 'new-post', label: 'เขียนบทความ' },
    ],
  },
  {
    id: 'content',
    label: 'เนื้อหา',
    items: [{ id: 'home', label: 'หน้าแรก', hint: '/' }],
  },
];

const meta = {
  title: 'Overlay/CommandPalette',
  component: CommandPalette,
  tags: ['autodocs'],
  args: {
    open: false,
    query: '',
    sections,
    onQueryChange: () => {},
    onSelect: () => {},
    onClose: () => {},
  },
} satisfies Meta<typeof CommandPalette>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Closed: Story = {};

const PaletteDemo = () => {
  const [open, setOpen] = useState(true);
  const [query, setQuery] = useState('');
  const filtered = sections
    .map((section) => ({
      ...section,
      items: section.items.filter((item) => item.label.includes(query)),
    }))
    .filter((section) => section.items.length > 0);

  return (
    <>
      <Button onClick={() => setOpen(true)}>เปิดค้นหา (Ctrl/⌘+K)</Button>
      <CommandPalette
        open={open}
        query={query}
        sections={filtered}
        onQueryChange={setQuery}
        onSelect={() => setOpen(false)}
        onClose={() => setOpen(false)}
      />
    </>
  );
};

export const Open: Story = {
  render: () => <PaletteDemo />,
};
