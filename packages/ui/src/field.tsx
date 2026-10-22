import type { ReactNode } from 'react';
import { cn } from './cn.js';

export interface FieldProps {
  id?: string;
  label?: ReactNode;
  hint?: ReactNode;
  error?: ReactNode;
  required?: boolean;
  className?: string;
  children: ReactNode;
}

/** Label + control + hint/error wrapper. Hint and error ids match `aria-describedby` helpers. */
export const Field = ({
  id,
  label,
  hint,
  error,
  required = false,
  className,
  children,
}: FieldProps) => (
  <div className={cn('ui-field', className)}>
    {label ? (
      <label className="ui-field__label" htmlFor={id}>
        {label}
        {required ? (
          <span className="ui-field__required" aria-hidden="true">
            *
          </span>
        ) : null}
      </label>
    ) : null}
    {children}
    {error ? (
      <p className="ui-field__error" id={id ? `${id}-error` : undefined} role="alert">
        {error}
      </p>
    ) : hint ? (
      <p className="ui-field__hint" id={id ? `${id}-hint` : undefined}>
        {hint}
      </p>
    ) : null}
  </div>
);

/** Builds the `aria-describedby` value for a field, or `undefined` when nothing describes it. */
export const fieldDescribedBy = (
  id: string | undefined,
  error: unknown,
  hint: unknown,
): string | undefined => {
  if (!id) {
    return undefined;
  }
  return error ? `${id}-error` : hint ? `${id}-hint` : undefined;
};
