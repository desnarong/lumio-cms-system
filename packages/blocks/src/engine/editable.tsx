import { createElement } from 'react';
import type { CSSProperties, ElementType } from 'react';
import { cn } from '@lumio/ui/cn';

export interface EditableProps {
  /** Path to the text inside the block node, e.g. `props.heading`. */
  path: string;
  value: string;
  as?: ElementType;
  className?: string;
  style?: CSSProperties;
  multiline?: boolean;
  /** Screen-reader label the editor uses once the text becomes editable. */
  label?: string;
  placeholder?: string;
}

/**
 * Text a block owns. It stays a plain element so the public site renders it as static
 * HTML with no client JavaScript; `data-editable-path` is what the editor uses to turn
 * the same element into an inline text box (see `attachInlineEditing`).
 */
export const Editable = ({
  path,
  value,
  as,
  className,
  style,
  multiline = false,
  label,
  placeholder,
}: EditableProps) => {
  const Tag = (as ?? 'span') as ElementType;
  return createElement(
    Tag,
    {
      className: cn('lumio-editable', className),
      style,
      'data-editable-path': path,
      'data-editable-multiline': multiline ? 'true' : undefined,
      'data-editable-label': label,
    } as never,
    value.length > 0 ? value : placeholder,
  );
};
