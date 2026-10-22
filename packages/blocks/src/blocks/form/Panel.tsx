'use client';

import { Select, TextField, Textarea } from '@lumio/ui';
import { useFormsCatalog } from '../../engine/forms.js';
import { CommonStylePanel, PanelSection } from '../../engine/panel.js';
import type { BlockPanelProps } from '../../types.js';
import { FORM_BLOCK_ALIGNMENTS, type FormBlockAlignment, type FormProps } from './schema.js';

const ALIGN_LABELS: Record<FormBlockAlignment, string> = {
  left: 'ชิดซ้าย',
  center: 'กึ่งกลาง',
};

export const FormPanel = ({ props, style, mode, onChange }: BlockPanelProps<FormProps>) => {
  const forms = useFormsCatalog();
  const formOptions = [
    { value: '', label: forms.length === 0 ? 'ยังไม่มีฟอร์มในเว็บนี้' : '— เลือกฟอร์ม —' },
    ...forms.map((form) => ({ value: form.id, label: form.name })),
  ];

  return (
    <>
      <PanelSection title="ฟอร์ม">
        <Select
          label="แบบฟอร์มที่จะแสดง"
          value={props.formId}
          options={formOptions}
          onChange={(event) => onChange('props.formId', event.target.value)}
        />
        <p className="lumio-panel-hint">
          สร้างฟอร์มและแก้ช่องต่าง ๆ ได้ที่เมนู เนื้อหา → ฟอร์ม &amp; ข้อความ
        </p>
      </PanelSection>

      <PanelSection title="เนื้อหา">
        <TextField
          label="หัวข้อ"
          value={props.heading}
          onChange={(event) => onChange('props.heading', event.target.value)}
        />
        <Textarea
          label="คำอธิบาย"
          rows={2}
          value={props.description}
          onChange={(event) => onChange('props.description', event.target.value)}
        />
        <TextField
          label="ข้อความบนปุ่ม"
          value={props.submitLabel}
          onChange={(event) => onChange('props.submitLabel', event.target.value)}
        />
        <Select
          label="การจัดวาง"
          value={props.align}
          options={FORM_BLOCK_ALIGNMENTS.map((align) => ({
            value: align,
            label: ALIGN_LABELS[align],
          }))}
          onChange={(event) => onChange('props.align', event.target.value)}
        />
      </PanelSection>

      <CommonStylePanel style={style} mode={mode} onChange={onChange} />
    </>
  );
};
