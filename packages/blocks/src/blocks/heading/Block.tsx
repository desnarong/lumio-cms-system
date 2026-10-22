import { Editable } from '../../engine/editable.js';
import type { BlockRenderProps } from '../../types.js';
import type { HeadingProps } from './schema.js';

export const HeadingBlock = ({ props }: BlockRenderProps<HeadingProps>) => (
  <Editable
    as={props.level}
    path="props.text"
    value={props.text}
    className={`lumio-heading lumio-heading--${props.level}`}
    style={{ textAlign: props.align }}
    label="ข้อความหัวข้อ"
  />
);
