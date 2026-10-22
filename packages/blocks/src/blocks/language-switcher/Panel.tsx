'use client';

import { Select, TextField } from '@lumio/ui';
import { CommonStylePanel, PanelSection } from '../../engine/panel.js';
import type { BlockPanelProps } from '../../types.js';
import {
  LANGUAGE_DISPLAYS,
  type LanguageDisplay,
  type LanguageSwitcherProps,
} from './schema.js';

const DISPLAY_LABELS: Record<LanguageDisplay, string> = {
  inline: 'เรียงในบรรทัด',
  stacked: 'เรียงเป็นแนวตั้ง',
};

export const LanguageSwitcherPanel = ({
  props,
  style,
  mode,
  onChange,
}: BlockPanelProps<LanguageSwitcherProps>) => (
  <>
    <PanelSection title="ภาษา">
      <p className="lumio-panel-hint">
        เพิ่มภาษาที่เมนู ตั้งค่า → ภาษา แล้วสร้างคำแปลของหน้านี้จากปุ่ม 🌐 ในแถบด้านบน
      </p>
      <Select
        label="การจัดวาง"
        value={props.display}
        options={LANGUAGE_DISPLAYS.map((value) => ({ value, label: DISPLAY_LABELS[value] }))}
        onChange={(event) => onChange('props.display', event.target.value)}
      />
      <Select
        label="ภาษาที่ยังไม่มีคำแปล"
        value={props.showUnavailable ? 'show' : 'hide'}
        options={[
          { value: 'hide', label: 'ซ่อน' },
          { value: 'show', label: 'แสดงแบบจาง' },
        ]}
        onChange={(event) => onChange('props.showUnavailable', event.target.value === 'show')}
      />
    </PanelSection>

    <PanelSection title="เนื้อหา">
      <TextField
        label="ป้ายกำกับ"
        hint="เว้นว่างเพื่อซ่อน"
        value={props.label}
        onChange={(event) => onChange('props.label', event.target.value)}
      />
    </PanelSection>

    <CommonStylePanel style={style} mode={mode} onChange={onChange} />
  </>
);