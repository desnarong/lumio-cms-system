import { Editable } from '../../engine/editable.js';
import type { BlockRenderProps } from '../../types.js';
import type { HeadingProps } from './schema.js';

export const HeadingBlock = ({ props, block }: BlockRenderProps<HeadingProps>) => (
  <Editable
    as={props.level}
    path="props.text"
    value={props.text}
    runs={block.textStyles?.['props.text']}
    className={`lumio-heading lumio-heading--${props.level} lumio-heading--${props.weight}`}
    style={{ textAlign: props.align }}
    label="ข้อความหัวข้อ"
  />
);
