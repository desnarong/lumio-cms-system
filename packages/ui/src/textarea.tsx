import type { ReactNode, TextareaHTMLAttributes } from 'react';
import { cn } from './cn.js';
import { Field, fieldDescribedBy } from './field.js';

export interface TextareaProps extends TextareaHTMLAttributes<HTMLTextAreaElement> {
  invalid?: boolean;
  label?: ReactNode;
  hint?: ReactNode;
  error?: ReactNode;
  required?: boolean;
  fieldClassName?: string;
}

export const Textarea = ({
  id,
  label,
  hint,
  error,
  required,
  invalid,
  className,
  fieldClassName,
  rows = 4,
  ...rest
}: TextareaProps) => (
  <Field
    id={id}
    label={label}
    hint={hint}
    error={error}
    required={required}
    className={fieldClassName}
  >
    <textarea
      id={id}
      rows={rows}
      className={cn('ui-textarea', (invalid ?? Boolean(error)) && 'ui-input--invalid', className)}
      aria-invalid={(invalid ?? Boolean(error)) || undefined}
      required={required}
      aria-describedby={fieldDescribedBy(id, error, hint)}
      {...rest}
    />
  </Field>
);
