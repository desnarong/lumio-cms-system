'use client';

import { ImagePicker, LinkPicker, Select, TextField } from '@lumio/ui';
import { useMediaPicker } from '../../engine/media-picker.js';
import { CommonStylePanel, PanelItemList, PanelSection } from '../../engine/panel.js';
import type { BlockPanelProps } from '../../types.js';
import { buttonVariantOptions, imageFromPick, imageFromUrl } from '../common.js';
import {
  HERO_LAYOUTS,
  HERO_MAX_BUTTONS,
  type HeroButton,
  type HeroLayout,
  type HeroProps,
} from './schema.js';

const LAYOUT_LABELS: Record<HeroLayout, string> = {
  centered: 'ข้อความกึ่งกลาง',
  'split-right': 'ข้อความซ้าย รูปขวา',
  'split-left': 'รูปซ้าย ข้อความขวา',
};

const newButton = (): HeroButton => ({
  label: 'ปุ่มใหม่',
  href: '/',
  variant: 'secondary',
  external: false,
});

export const HeroPanel = ({ props, style, mode, onChange }: BlockPanelProps<HeroProps>) => {
  const mediaPicker = useMediaPicker();

  return (
    <>
      <PanelSection title="เนื้อหา">
        <TextField
          label="หัวข้อหลัก"
          value={props.heading}
          onChange={(event) => onChange('props.heading', event.target.value)}
        />
        <TextField
          label="คำอธิบายใต้หัวข้อ"
          value={props.subheading}
          onChange={(event) => onChange('props.subheading', event.target.value)}
        />
      </PanelSection>

      <PanelSection title="ปุ่ม">
        <PanelItemList
          items={props.buttons}
          addLabel="เพิ่มปุ่ม"
          max={HERO_MAX_BUTTONS}
          create={newButton}
          onChange={(buttons) => onChange('props.buttons', buttons)}
        >
          {(index) => {
            const button = props.buttons[index];
            if (!button) {
              return null;
            }
            return (
              <>
                <TextField
                  label="ข้อความบนปุ่ม"
                  value={button.label}
                  onChange={(event) => onChange(`props.buttons.${index}.label`, event.target.value)}
                />
                <LinkPicker
                  label="ปลายทาง"
                  value={button.href}
                  external={button.external}
                  onChange={(href) => onChange(`props.buttons.${index}.href`, href)}
                  onExternalChange={(external) =>
                    onChange(`props.buttons.${index}.external`, external)
                  }
                />
                <Select
                  label="รูปแบบปุ่ม"
                  value={button.variant}
                  options={buttonVariantOptions}
                  onChange={(event) =>
                    onChange(`props.buttons.${index}.variant`, event.target.value)
                  }
                />
              </>
            );
          }}
        </PanelItemList>
      </PanelSection>

      <PanelSection title="รูปภาพ">
        <ImagePicker
          label="รูปประกอบ"
          value={props.image?.src ?? null}
          alt={props.image?.alt ?? ''}
          disabled={!mediaPicker}
          hint={mediaPicker ? undefined : 'ยังไม่ได้เชื่อมคลังรูปภาพในหน้านี้'}
          onPick={() => {
            void mediaPicker
              ?.pick({ aspect: 'wide' })
              .then((picked) => {
                if (picked) {
                  onChange('props.image', imageFromPick(picked, props.image?.alt ?? ''));
                }
              })
              .catch(() => undefined);
          }}
          onChange={(url) => onChange('props.image', imageFromUrl(url, props.image?.alt ?? ''))}
        />
        <TextField
          label="คำอธิบายรูป (alt)"
          hint="อธิบายภาพสั้น ๆ เพื่อผู้ใช้โปรแกรมอ่านหน้าจอ"
          value={props.image?.alt ?? ''}
          onChange={(event) => {
            const alt = event.target.value;
            onChange(
              'props.image',
              props.image ? { ...props.image, alt } : { mediaId: '', alt, src: undefined },
            );
          }}
        />
      </PanelSection>

      <PanelSection title="หน้าตา">
        <Select
          label="รูปแบบการวาง"
          value={props.layout}
          options={HERO_LAYOUTS.map((layout) => ({ value: layout, label: LAYOUT_LABELS[layout] }))}
          onChange={(event) => onChange('props.layout', event.target.value)}
        />
      </PanelSection>

      <CommonStylePanel style={style} mode={mode} onChange={onChange} />
    </>
  );
};
