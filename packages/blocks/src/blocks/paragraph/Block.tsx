import { Editable } from '../../engine/editable.js';
import type { BlockRenderProps } from '../../types.js';
import type { ParagraphProps } from './schema.js';

export const ParagraphBlock = ({ props, block }: BlockRenderProps<ParagraphProps>) => (
  <Editable
    as="p"
    multiline
    path="props.text"
    value={props.text}
    runs={block.textStyles?.['props.text']}
    layout={block.textLayouts?.['props.text']}
    className={`lumio-paragraph lumio-paragraph--${props.size}${
      props.width === 'full' ? ' lumio-paragraph--full' : ''
    }`}
    style={{ textAlign: props.align }}
    label="ข้อความย่อหน้า"
  />
);
