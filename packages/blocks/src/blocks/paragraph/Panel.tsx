'use client';

import { Select, Textarea } from '@lumio/ui';
import { CommonStylePanel, PanelSection } from '../../engine/panel.js';
import type { BlockPanelProps } from '../../types.js';
import { alignmentOptions } from '../common.js';
import { PARAGRAPH_SIZES, type ParagraphProps, type ParagraphSize } from './schema.js';

const SIZE_LABELS: Record<ParagraphSize, string> = {
  base: 'ปกติ',
  lg: 'ใหญ่ (คำนำ)',
};

export const ParagraphPanel = ({
  props,
  style,
  mode,
  onChange,
}: BlockPanelProps<ParagraphProps>) => (
  <>
    <PanelSection title="เนื้อหา">
      <Textarea
        label="ข้อความ"
        rows={6}
        value={props.text}
        onChange={(event) => onChange('props.text', event.target.value)}
      />
      <Select
        label="ขนาดตัวอักษร"
        value={props.size}
        options={PARAGRAPH_SIZES.map((size) => ({ value: size, label: SIZE_LABELS[size] }))}
        onChange={(event) => onChange('props.size', event.target.value)}
      />
      <Select
        label="การจัดวาง"
        value={props.align}
        options={alignmentOptions}
        onChange={(event) => onChange('props.align', event.target.value)}
      />
    </PanelSection>
    <CommonStylePanel style={style} mode={mode} onChange={onChange} />
  </>
);
