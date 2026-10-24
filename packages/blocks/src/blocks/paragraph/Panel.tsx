'use client';

import { Select, Textarea } from '@lumio/ui';
import { CommonStylePanel, PanelSection } from '../../engine/panel.js';
import type { BlockPanelProps } from '../../types.js';
import { alignmentOptions } from '../common.js';
import {
  PARAGRAPH_SIZES,
  PARAGRAPH_WIDTHS,
  type ParagraphProps,
  type ParagraphSize,
  type ParagraphWidth,
} from './schema.js';

const WIDTH_LABELS: Record<ParagraphWidth, string> = {
  contained: 'ความกว้างอ่านสบาย (70 ตัวอักษร)',
  full: 'เต็มความกว้าง 100%',
};

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
        label="ความกว้าง"
        value={props.width}
        options={PARAGRAPH_WIDTHS.map((width) => ({
          value: width,
          label: WIDTH_LABELS[width],
        }))}
        onChange={(event) => onChange('props.width', event.target.value)}
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
