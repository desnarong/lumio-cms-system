import type { ReactNode, SelectHTMLAttributes } from 'react';
import { cn } from './cn.js';
import { Field, fieldDescribedBy } from './field.js';

export interface SelectOption {
  value: string;
  label: string;
  disabled?: boolean;
}

export interface SelectProps extends SelectHTMLAttributes<HTMLSelectElement> {
  invalid?: boolean;
  label?: ReactNode;
  hint?: ReactNode;
  error?: ReactNode;
  required?: boolean;
  options?: SelectOption[];
  placeholder?: string;
  fieldClassName?: string;
}

export const Select = ({
  id,
  label,
  hint,
  error,
  required,
  invalid,
  options,
  placeholder,
  className,
  fieldClassName,
  children,
  ...rest
}: SelectProps) => (
  <Field
    id={id}
    label={label}
    hint={hint}
    error={error}
    required={required}
    className={fieldClassName}
  >
    <select
      id={id}
      className={cn('ui-select', (invalid ?? Boolean(error)) && 'ui-input--invalid', className)}
      aria-invalid={(invalid ?? Boolean(error)) || undefined}
      required={required}
      aria-describedby={fieldDescribedBy(id, error, hint)}
      {...rest}
    >
      {placeholder ? (
        <option value="" disabled>
          {placeholder}
        </option>
      ) : null}
      {options?.map((option) => (
        <option key={option.value} value={option.value} disabled={option.disabled}>
          {option.label}
        </option>
      ))}
      {children}
    </select>
  </Field>
);
