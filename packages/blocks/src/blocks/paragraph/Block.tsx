import { Editable } from '../../engine/editable.js';
import type { BlockRenderProps } from '../../types.js';
import type { ParagraphProps } from './schema.js';

export const ParagraphBlock = ({ props }: BlockRenderProps<ParagraphProps>) => (
  <Editable
    as="p"
    multiline
    path="props.text"
    value={props.text}
    className={`lumio-paragraph lumio-paragraph--${props.size}`}
    style={{ textAlign: props.align }}
    label="ข้อความย่อหน้า"
  />
);
