import type { ReactNode } from 'react';
import { Button } from './button.js';
import { cn } from './cn.js';
import { useT } from './i18n.js';
import { Field, fieldDescribedBy } from './field.js';
import { Input } from './input.js';
import { Switch } from './switch.js';

export interface LinkPickerProps {
  id?: string;
  label?: ReactNode;
  hint?: ReactNode;
  error?: ReactNode;
  value?: string;
  placeholder?: string;
  external?: boolean;
  disabled?: boolean;
  className?: string;
  onChange?: (value: string) => void;
  onExternalChange?: (external: boolean) => void;
  /** Called when the user asks to link to an existing page. */
  onPickPage?: () => void;
}

/** URL field with an external-link toggle and a shortcut to pick an internal page. */
export const LinkPicker = ({
  id,
  label,
  hint,
  error,
  value,
  placeholder,
  external = false,
  disabled = false,
  className,
  onChange,
  onExternalChange,
  onPickPage,
}: LinkPickerProps) => {
  const t = useT();
  return (
  <Field id={id} label={label} hint={hint} error={error} className={className}>
    <div className="ui-link-picker">
      <div className="ui-link-picker__row">
        <Input
          id={id}
          type="text"
          className="ui-link-picker__input"
          value={value}
          placeholder={placeholder ?? t('linkPicker.placeholder')}
          disabled={disabled}
          spellCheck={false}
          invalid={Boolean(error)}
          readOnly={value !== undefined && !onChange ? true : undefined}
          aria-describedby={fieldDescribedBy(id, error, hint)}
          onChange={onChange ? (event) => onChange(event.target.value) : undefined}
        />
        {onPickPage ? (
          <Button
            type="button"
            variant="secondary"
            size="md"
            disabled={disabled}
            onClick={onPickPage}
          >
            {t('linkPicker.pickPage')}
          </Button>
        ) : null}
      </div>
      <Switch
        label={t('linkPicker.openInNewTab')}
        checked={external}
        disabled={disabled}
        onChange={(next) => onExternalChange?.(next)}
        className={cn('ui-link-picker__external')}
      />
    </div>
  </Field>
  );
};
