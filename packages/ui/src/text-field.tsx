import type { ReactNode } from 'react';
import { Field, fieldDescribedBy } from './field.js';
import { Input, type InputProps } from './input.js';

export interface TextFieldProps extends InputProps {
  label?: ReactNode;
  hint?: ReactNode;
  error?: ReactNode;
  required?: boolean;
  fieldClassName?: string;
}

/** Text input with a label, hint and error message wired up for screen readers. */
export const TextField = ({
  id,
  label,
  hint,
  error,
  required,
  className,
  fieldClassName,
  ...rest
}: TextFieldProps) => (
  <Field
    id={id}
    label={label}
    hint={hint}
    error={error}
    required={required}
    className={fieldClassName}
  >
    <Input
      id={id}
      className={className}
      invalid={Boolean(error)}
      required={required}
      aria-describedby={fieldDescribedBy(id, error, hint)}
      {...rest}
    />
  </Field>
);
