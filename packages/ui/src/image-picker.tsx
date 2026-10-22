import type { ReactNode } from 'react';
import { Button } from './button.js';
import { cn } from './cn.js';
import { Icon } from './icon.js';
import { useT } from './i18n.js';
import { Field } from './field.js';

export interface ImagePickerProps {
  id?: string;
  label?: ReactNode;
  hint?: ReactNode;
  error?: ReactNode;
  value?: string | null;
  alt?: string;
  aspect?: 'square' | 'wide';
  disabled?: boolean;
  pickLabel?: string;
  className?: string;
  /** Called when the user asks to choose an image (opens the media library). */
  onPick?: () => void;
  onChange?: (value: string | null) => void;
}

/** Shows the chosen image with a preview and replace/remove actions. */
export const ImagePicker = ({
  id,
  label,
  hint,
  error,
  value,
  alt = '',
  aspect = 'wide',
  disabled = false,
  pickLabel,
  className,
  onPick,
  onChange,
}: ImagePickerProps) => {
  const t = useT();
  return (
    <Field id={id} label={label} hint={hint} error={error} className={className}>
      <div className={cn('ui-image-picker', `ui-image-picker--${aspect}`)}>
        <div className="ui-image-picker__preview">
          {value ? (
            <img className="ui-image-picker__image" src={value} alt={alt} />
          ) : (
            <span className="ui-image-picker__placeholder" aria-hidden="true">
              <Icon name="image" size={28} />
            </span>
          )}
        </div>
        <div className="ui-image-picker__actions">
          <Button type="button" variant="secondary" size="sm" disabled={disabled} onClick={onPick}>
            {value ? t('imagePicker.change') : (pickLabel ?? t('imagePicker.pick'))}
          </Button>
          {value ? (
            <Button
              type="button"
              variant="ghost"
              size="sm"
              disabled={disabled}
              onClick={() => onChange?.(null)}
            >
              ลบภาพ
            </Button>
          ) : null}
        </div>
      </div>
    </Field>
  );
};
