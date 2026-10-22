import { useId, useState } from 'react';
import type { ReactNode } from 'react';
import { cn } from './cn.js';
import { useT } from './i18n.js';
import { Field } from './field.js';

const HEX_PATTERN = /^#([0-9a-fA-F]{6})$/;

export interface ColorPickerProps {
  id?: string;
  label?: ReactNode;
  hint?: ReactNode;
  error?: ReactNode;
  value?: string;
  defaultValue?: string;
  presets?: string[];
  disabled?: boolean;
  className?: string;
  onChange?: (value: string) => void;
}

/** Colour swatch with a hex input and optional brand presets. */
export const ColorPicker = ({
  id,
  label,
  hint,
  error,
  value,
  defaultValue = '#6366F1',
  presets = [],
  disabled = false,
  className,
  onChange,
}: ColorPickerProps) => {
  const t = useT();
  const generatedId = useId();
  const pickerId = id ?? generatedId;
  const [internal, setInternal] = useState(defaultValue);
  const current = value ?? internal;

  const update = (next: string) => {
    if (value === undefined) {
      setInternal(next);
    }
    onChange?.(next);
  };

  const isInvalidHex = !HEX_PATTERN.test(current);

  return (
    <Field id={pickerId} label={label} hint={hint} error={error} className={className}>
      <div className={cn('ui-color-picker', disabled && 'ui-color-picker--disabled')}>
        <span
          className="ui-color-picker__swatch"
          style={{ background: isInvalidHex ? 'transparent' : current }}
          aria-hidden="true"
        />
        <input
          id={pickerId}
          type="color"
          className="ui-color-picker__native"
          value={isInvalidHex ? defaultValue : current}
          disabled={disabled}
          onChange={(event) => update(event.target.value.toUpperCase())}
        />
        <input
          type="text"
          className={cn('ui-input', 'ui-color-picker__hex', isInvalidHex && 'ui-input--invalid')}
          value={current}
          disabled={disabled}
          spellCheck={false}
          aria-label={t('colorPicker.hexLabel')}
          aria-invalid={isInvalidHex || undefined}
          onChange={(event) => update(event.target.value)}
        />
      </div>
      {presets.length > 0 ? (
        <div className="ui-color-picker__presets" role="group" aria-label={t('colorPicker.presetsLabel')}>
          {presets.map((preset) => (
            <button
              key={preset}
              type="button"
              className="ui-color-picker__preset"
              style={{ background: preset }}
              aria-label={t('colorPicker.useColor', { color: preset })}
              aria-pressed={preset.toUpperCase() === current.toUpperCase()}
              disabled={disabled}
              onClick={() => update(preset.toUpperCase())}
            />
          ))}
        </div>
      ) : null}
    </Field>
  );
};
