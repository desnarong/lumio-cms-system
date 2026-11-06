'use client';

import { useState } from 'react';

export interface QuantityStepperProps {
  name: string;
  defaultValue: number;
  max: number;
  id?: string;
  /** Accessible names, translated by the server page (keeps the catalogue out of the bundle). */
  labels: { decrease: string; quantity: string; increase: string };
}

const clamp = (value: number, max: number): number => {
  if (!Number.isFinite(value)) return 1;
  return Math.min(max, Math.max(1, Math.trunc(value)));
};

/**
 * The − / number / + control from the product page. It is the only client
 * JavaScript the shop ships, and the number input still works if it never
 * hydrates.
 */
export const QuantityStepper = ({ name, defaultValue, max, id, labels }: QuantityStepperProps) => {
  const [value, setValue] = useState(() => clamp(defaultValue, max));

  return (
    <div className="shop-stepper">
      <button
        type="button"
        className="shop-stepper__button"
        aria-label={labels.decrease}
        onClick={() => setValue((current) => clamp(current - 1, max))}
      >
        −
      </button>
      <input
        {...(id ? { id } : {})}
        className="shop-stepper__input"
        name={name}
        type="number"
        inputMode="numeric"
        min={1}
        max={max}
        value={value}
        aria-label={labels.quantity}
        onChange={(event) => setValue(clamp(Number(event.target.value), max))}
      />
      <button
        type="button"
        className="shop-stepper__button"
        aria-label={labels.increase}
        onClick={() => setValue((current) => clamp(current + 1, max))}
      >
        +
      </button>
    </div>
  );
};
