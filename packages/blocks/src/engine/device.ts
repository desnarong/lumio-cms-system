export const EDITOR_DEVICES = [
  { id: 'mobile', label: 'มือถือ', width: 390 },
  { id: 'tablet', label: 'แท็บเล็ต', width: 768 },
  { id: 'desktop', label: 'เดสก์ท็อป', width: 0 },
] as const;

export type EditorDevice = (typeof EDITOR_DEVICES)[number]['id'];

/** Preview width in px; `0` means the frame stretches to the editor width. */
export const deviceWidth = (device: EditorDevice): number =>
  EDITOR_DEVICES.find((item) => item.id === device)?.width ?? 0;
