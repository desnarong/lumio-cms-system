import { createElement } from 'react';
import type { CSSProperties, ElementType } from 'react';
import type { TextRun } from '@lumio/shared';
import { cn } from '@lumio/ui/cn';
import { textSegments } from './runs.js';

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
  /** Inline styling for parts of the value; offsets are character positions. */
  runs?: readonly TextRun[];
}

const runClassName = (run: TextRun): string =>
  cn(
    'lumio-run',
    run.color && run.color !== 'inherit' ? `lumio-run--color-${run.color}` : undefined,
    run.size ? `lumio-run--size-${run.size}` : undefined,
  );

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
  runs,
}: EditableProps) => {
  const Tag = (as ?? 'span') as ElementType;
  const segments = textSegments(value, runs);

  return createElement(
    Tag,
    {
      className: cn('lumio-editable', className),
      style,
      'data-editable-path': path,
      'data-editable-multiline': multiline ? 'true' : undefined,
      'data-editable-label': label,
      // Drawn by CSS only while the element is being edited, so the hint never
      // leaks into the public HTML a visitor receives.
      'data-editable-placeholder': placeholder,
    } as never,
    segments.length === 1 && segments[0]?.run === null
      ? value
      : segments.map((segment, index) =>
          segment.run
            ? createElement(
                'span',
                {
                  key: index,
                  className: runClassName(segment.run),
                  style:
                    segment.run.colorHex || segment.run.sizePx
                      ? {
                          ...(segment.run.colorHex ? { color: segment.run.colorHex } : {}),
                          ...(segment.run.sizePx
                            ? { fontSize: `${segment.run.sizePx}px`, lineHeight: 1.2 }
                            : {}),
                        }
                      : undefined,
                },
                segment.text,
              )
            : segment.text,
        ),
  );
};
