import { Editable } from '../../engine/editable.js';
import type { BlockRenderProps } from '../../types.js';
import type { ButtonProps } from './schema.js';

export const ButtonBlock = ({ props, block }: BlockRenderProps<ButtonProps>) => (
  <div className={`lumio-button lumio-button--${props.align}`}>
    <a
      className={`ui-button ui-button--${props.variant} ui-button--${props.size}${
        props.fullWidth ? ' lumio-button__link--full' : ''
      }`}
      href={props.href.length > 0 ? props.href : '#'}
      target={props.external ? '_blank' : undefined}
      rel={props.external ? 'noopener noreferrer' : undefined}
    >
      <Editable path="props.label" value={props.label}
      runs={block.textStyles?.['props.label']} label="ข้อความปุ่ม" />
    </a>
  </div>
);
