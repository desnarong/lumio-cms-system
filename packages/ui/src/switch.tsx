import { useId, useState } from 'react';
import type { ReactNode } from 'react';
import { cn } from './cn.js';

export interface SwitchProps {
  id?: string;
  name?: string;
  label?: ReactNode;
  description?: ReactNode;
  checked?: boolean;
  defaultChecked?: boolean;
  disabled?: boolean;
  className?: string;
  onChange?: (checked: boolean) => void;
}

/** Accessible on/off control. Works controlled (`checked`) or uncontrolled (`defaultChecked`). */
export const Switch = ({
  id,
  name,
  label,
  description,
  checked,
  defaultChecked = false,
  disabled = false,
  className,
  onChange,
}: SwitchProps) => {
  const generatedId = useId();
  const controlId = id ?? generatedId;
  const descriptionId = description ? `${controlId}-description` : undefined;
  const isControlled = checked !== undefined;
  const [internal, setInternal] = useState(defaultChecked);
  const isOn = isControlled ? checked : internal;

  const toggle = () => {
    const next = !isOn;
    if (!isControlled) {
      setInternal(next);
    }
    onChange?.(next);
  };

  return (
    <div className={cn('ui-switch', disabled && 'ui-switch--disabled', className)}>
      <button
        type="button"
        id={controlId}
        role="switch"
        aria-checked={isOn}
        aria-describedby={descriptionId}
        disabled={disabled}
        className="ui-switch__control"
        onClick={toggle}
      >
        <span className="ui-switch__thumb" aria-hidden="true" />
      </button>
      {label || description ? (
        <span className="ui-switch__text">
          {label ? (
            <label className="ui-switch__label" htmlFor={controlId}>
              {label}
            </label>
          ) : null}
          {description ? (
            <span className="ui-switch__description" id={descriptionId}>
              {description}
            </span>
          ) : null}
        </span>
      ) : null}
      {name ? <input type="hidden" name={name} value={isOn ? 'true' : 'false'} /> : null}
    </div>
  );
};
