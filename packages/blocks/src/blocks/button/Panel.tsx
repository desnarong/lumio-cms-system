'use client';

import { LinkPicker, Select, Switch, TextField } from '@lumio/ui';
import { CommonStylePanel, PanelSection } from '../../engine/panel.js';
import type { BlockPanelProps } from '../../types.js';
import { alignmentOptions, buttonSizeOptions, buttonVariantOptions } from '../common.js';
import type { ButtonProps } from './schema.js';

export const ButtonPanel = ({ props, style, mode, onChange }: BlockPanelProps<ButtonProps>) => (
  <>
    <PanelSection title="เนื้อหา">
      <TextField
        label="ข้อความบนปุ่ม"
        value={props.label}
        onChange={(event) => onChange('props.label', event.target.value)}
      />
      <LinkPicker
        label="ปลายทางเมื่อกด"
        value={props.href}
        external={props.external}
        onChange={(href) => onChange('props.href', href)}
        onExternalChange={(external) => onChange('props.external', external)}
      />
    </PanelSection>

    <PanelSection title="รูปแบบปุ่ม">
      <Select
        label="รูปแบบปุ่ม"
        value={props.variant}
        options={buttonVariantOptions}
        onChange={(event) => onChange('props.variant', event.target.value)}
      />
      <Select
        label="ขนาดปุ่ม"
        value={props.size}
        options={buttonSizeOptions}
        onChange={(event) => onChange('props.size', event.target.value)}
      />
      <Select
        label="การจัดวาง"
        value={props.align}
        options={alignmentOptions}
        onChange={(event) => onChange('props.align', event.target.value)}
      />
      <Switch
        label="กว้างเต็มพื้นที่"
        checked={props.fullWidth}
        onChange={(checked) => onChange('props.fullWidth', checked)}
      />
    </PanelSection>

    <CommonStylePanel style={style} mode={mode} onChange={onChange} />
  </>
);
