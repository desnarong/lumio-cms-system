export const EDITOR_DEVICES = [
  { id: 'mobile', label: 'มือถือ', width: 390 },
  { id: 'tablet', label: 'แท็บเล็ต', width: 768 },
  { id: 'desktop', label: 'เดสก์ท็อป', width: 1920 },
] as const;

export type EditorDevice = (typeof EDITOR_DEVICES)[number]['id'];

/**
 * Width the device preview is laid out at, before the editor scales it down to
 * fit. Desktop uses the width the public site is designed against, so what the
 * owner sees in the editor matches the published page.
 */
export const deviceWidth = (device: EditorDevice): number =>
  EDITOR_DEVICES.find((item) => item.id === device)?.width ?? 1920;
