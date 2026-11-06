'use client';

import { Select, TextField } from '@lumio/ui';
import { CommonStylePanel, PanelSection } from '../../engine/panel.js';
import type { BlockPanelProps } from '../../types.js';
import { alignmentOptions } from '../common.js';
import {
  HEADING_LEVELS,
  HEADING_WEIGHTS,
  type HeadingLevel,
  type HeadingProps,
  type HeadingWeight,
} from './schema.js';
import { bt } from '../../i18n.js';

const WEIGHT_LABELS = (): Record<HeadingWeight, string> => ({
  light: bt('ตัวบาง'),
  regular: bt('ปกติ'),
  semibold: bt('กึ่งหนา'),
  bold: bt('ตัวหนา'),
});

const LEVEL_LABELS = (): Record<HeadingLevel, string> => ({
  h1: bt('หัวข้อใหญ่สุด (H1)'),
  h2: bt('หัวข้อรอง (H2)'),
  h3: bt('หัวข้อย่อย (H3)'),
  h4: bt('หัวข้อย่อยเล็ก (H4)'),
});

export const HeadingPanel = ({ props, style, mode, onChange }: BlockPanelProps<HeadingProps>) => (
  <>
    <PanelSection title={bt('เนื้อหา')}>
      <TextField
        label={bt('ข้อความหัวข้อ')}
        value={props.text}
        onChange={(event) => onChange('props.text', event.target.value)}
      />
      <Select
        label={bt('ระดับหัวข้อ')}
        value={props.level}
        options={HEADING_LEVELS.map((level) => ({ value: level, label: LEVEL_LABELS()[level] }))}
        onChange={(event) => onChange('props.level', event.target.value)}
      />
      <Select
        label={bt('น้ำหนักตัวอักษร')}
        value={props.weight}
        options={HEADING_WEIGHTS.map((weight) => ({
          value: weight,
          label: WEIGHT_LABELS()[weight],
        }))}
        onChange={(event) => onChange('props.weight', event.target.value)}
      />
      <Select
        label={bt('การจัดวาง')}
        value={props.align}
        options={alignmentOptions()}
        onChange={(event) => onChange('props.align', event.target.value)}
      />
    </PanelSection>
    <CommonStylePanel style={style} mode={mode} onChange={onChange} />
  </>
);
