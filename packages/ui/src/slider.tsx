import { useId } from 'react';
import type { ReactNode } from 'react';
import { cn } from './cn.js';

export interface SliderProps {
  id?: string;
  name?: string;
  label?: ReactNode;
  min?: number;
  max?: number;
  step?: number;
  value?: number;
  defaultValue?: number;
  disabled?: boolean;
  showValue?: boolean;
  formatValue?: (value: number) => string;
  className?: string;
  onChange?: (value: number) => void;
}

/** Range slider built on the native input so keyboard and touch behaviour come for free. */
export const Slider = ({
  id,
  name,
  label,
  min = 0,
  max = 100,
  step = 1,
  value,
  defaultValue,
  disabled = false,
  showValue = true,
  formatValue,
  className,
  onChange,
}: SliderProps) => {
  const generatedId = useId();
  const sliderId = id ?? generatedId;
  const current = value ?? defaultValue ?? min;

  return (
    <div className={cn('ui-slider', disabled && 'ui-slider--disabled', className)}>
      {label || showValue ? (
        <div className="ui-slider__header">
          {label ? (
            <label className="ui-slider__label" htmlFor={sliderId}>
              {label}
            </label>
          ) : (
            <span />
          )}
          {showValue ? (
            <output className="ui-slider__value" htmlFor={sliderId}>
              {formatValue ? formatValue(current) : current}
            </output>
          ) : null}
        </div>
      ) : null}
      <input
        id={sliderId}
        name={name}
        type="range"
        className="ui-slider__input"
        min={min}
        max={max}
        step={step}
        value={value}
        defaultValue={defaultValue}
        disabled={disabled}
        onChange={onChange ? (event) => onChange(Number(event.target.value)) : undefined}
      />
    </div>
  );
};
