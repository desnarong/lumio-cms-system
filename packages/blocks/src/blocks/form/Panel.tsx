'use client';

import { Select, TextField, Textarea } from '@lumio/ui';
import { useFormsCatalog } from '../../engine/forms.js';
import { CommonStylePanel, PanelSection } from '../../engine/panel.js';
import type { BlockPanelProps } from '../../types.js';
import { FORM_BLOCK_ALIGNMENTS, type FormBlockAlignment, type FormProps } from './schema.js';
import { bt } from '../../i18n.js';

const ALIGN_LABELS = (): Record<FormBlockAlignment, string> => ({
  left: bt('ชิดซ้าย'),
  center: bt('กึ่งกลาง'),
});

export const FormPanel = ({ props, style, mode, onChange }: BlockPanelProps<FormProps>) => {
  const forms = useFormsCatalog();
  const formOptions = [
    { value: '', label: forms.length === 0 ? bt('ยังไม่มีฟอร์มในเว็บนี้') : bt('— เลือกฟอร์ม —') },
    ...forms.map((form) => ({ value: form.id, label: form.name })),
  ];

  return (
    <>
      <PanelSection title={bt('ฟอร์ม')}>
        <Select
          label={bt('แบบฟอร์มที่จะแสดง')}
          value={props.formId}
          options={formOptions}
          onChange={(event) => onChange('props.formId', event.target.value)}
        />
        <p className="lumio-panel-hint">
          {bt('สร้างฟอร์มและแก้ช่องต่าง ๆ ได้ที่เมนู เนื้อหา → ฟอร์ม & ข้อความ')}
        </p>
      </PanelSection>

      <PanelSection title={bt('เนื้อหา')}>
        <TextField
          label={bt('หัวข้อ')}
          value={props.heading}
          onChange={(event) => onChange('props.heading', event.target.value)}
        />
        <Textarea
          label={bt('คำอธิบาย')}
          rows={2}
          value={props.description}
          onChange={(event) => onChange('props.description', event.target.value)}
        />
        <TextField
          label={bt('ข้อความบนปุ่ม')}
          value={props.submitLabel}
          onChange={(event) => onChange('props.submitLabel', event.target.value)}
        />
        <Select
          label={bt('การจัดวาง')}
          value={props.align}
          options={FORM_BLOCK_ALIGNMENTS.map((align) => ({
            value: align,
            label: ALIGN_LABELS()[align],
          }))}
          onChange={(event) => onChange('props.align', event.target.value)}
        />
      </PanelSection>

      <CommonStylePanel style={style} mode={mode} onChange={onChange} />
    </>
  );
};
