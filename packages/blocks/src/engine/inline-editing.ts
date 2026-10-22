/**
 * Editor-side half of inline editing. Browser only: the editor calls this once its
 * block tree is mounted, and blocks stay plain server-rendered HTML until then.
 */

export interface InlineEditingOptions {
  /** Called with the block path and the new text once the user leaves the text box. */
  onChange: (path: string, value: string) => void;
  /** Restrict editing to these paths; omit to make every `Editable` in the root editable. */
  paths?: readonly string[];
}

const EDITABLE_SELECTOR = '[data-editable-path]';

const isMultiline = (element: HTMLElement): boolean => element.dataset.editableMultiline === 'true';

const readValue = (element: HTMLElement): string =>
  isMultiline(element) ? element.innerText : (element.textContent ?? '');

const activate = (element: HTMLElement): void => {
  element.contentEditable = 'true';
  element.setAttribute('role', 'textbox');
  element.setAttribute('aria-multiline', String(isMultiline(element)));
  const label = element.dataset.editableLabel;
  if (label) {
    element.setAttribute('aria-label', label);
  }
  if (!element.hasAttribute('tabindex')) {
    element.tabIndex = 0;
  }
};

const deactivate = (element: HTMLElement): void => {
  element.contentEditable = 'false';
  element.removeAttribute('role');
  element.removeAttribute('aria-multiline');
  element.removeAttribute('aria-label');
  element.removeAttribute('tabindex');
};

/**
 * Turns every `Editable` inside `root` into an inline text box and reports changes
 * through `onChange`. Returns a cleanup function that puts the DOM back as it was.
 */
export const attachInlineEditing = (
  root: HTMLElement,
  { onChange, paths }: InlineEditingOptions,
): (() => void) => {
  const targets = [...root.querySelectorAll<HTMLElement>(EDITABLE_SELECTOR)].filter(
    (element) => !paths || paths.includes(element.dataset.editablePath ?? ''),
  );

  const handleBlur = (event: FocusEvent): void => {
    const element = event.target as HTMLElement;
    const path = element.dataset.editablePath;
    const next = readValue(element);
    if (path && next !== element.dataset.editableValue) {
      element.dataset.editableValue = next;
      onChange(path, next);
    }
    deactivate(element);
  };

  const handleKeyDown = (event: KeyboardEvent): void => {
    const element = event.target as HTMLElement;
    if (event.key === 'Escape') {
      element.textContent = element.dataset.editableValue ?? '';
      element.blur();
      return;
    }
    if (event.key === 'Enter' && !isMultiline(element)) {
      event.preventDefault();
      element.blur();
    }
  };

  for (const element of targets) {
    element.dataset.editableValue = readValue(element);
    activate(element);
    element.addEventListener('blur', handleBlur);
    element.addEventListener('keydown', handleKeyDown);
  }

  return () => {
    for (const element of targets) {
      element.removeEventListener('blur', handleBlur);
      element.removeEventListener('keydown', handleKeyDown);
      delete element.dataset.editableValue;
      deactivate(element);
    }
  };
};
