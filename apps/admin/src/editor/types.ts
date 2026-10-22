export type EditorMode = 'edit' | 'design';

export type SaveState = 'idle' | 'saving' | 'saved' | 'error';

/** One editable text on the page, with the path that writes it back. */
export interface EditorTextField {
  path: string;
  label: string;
  value: string;
}