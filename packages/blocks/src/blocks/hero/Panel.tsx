'use client';

import { Button, ImagePicker, LinkPicker, Select, Switch, TextField } from '@lumio/ui';
import { useMediaPicker } from '../../engine/media-picker.js';
import { CommonStylePanel, PanelItemList, PanelSection } from '../../engine/panel.js';
import type { BlockPanelProps } from '../../types.js';
import { buttonVariantOptions, imageFromPick, imageFromUrl } from '../common.js';
import {
  HERO_LAYOUTS,
  HERO_MAX_BUTTONS,
  HERO_MAX_FLOATS,
  type HeroButton,
  type HeroFloat,
  type HeroLayout,
  type HeroProps,
} from './schema.js';

const HEIGHT_LABELS = [
  { value: 'cover', label: 'เต็มเฟรม (ครอบภาพ)' },
  { value: 'image', label: 'สูงตามรูปจริง (ไม่ครอป)' },
] as const;

const LAYOUT_LABELS: Record<HeroLayout, string> = {
  overlay: 'เต็มเฟรม · รูปพื้นหลัง ข้อความทับรูป',
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

  const updateFloat = (index: number, patch: Partial<HeroFloat>): void => {
    onChange(
      'props.foregrounds',
      props.foregrounds.map((item, itemIndex) =>
        itemIndex === index ? { ...item, ...patch } : item,
      ),
    );
  };

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

      <PanelSection title="พื้นหลังแบนเนอร์">
        <Select
          label="ตำแหน่งข้อความ"
          value={props.contentAlign}
          options={[
            { value: 'top', label: 'ชิดบน' },
            { value: 'center', label: 'กึ่งกลาง' },
            { value: 'bottom', label: 'ชิดล่าง' },
          ]}
          onChange={(event) => onChange('props.contentAlign', event.target.value)}
        />
        <Select
          label="ความสูงของแบนเนอร์"
          value={props.heightMode}
          options={[...HEIGHT_LABELS]}
          onChange={(event) => onChange('props.heightMode', event.target.value)}
        />
        <TextField
          label="ซูมรูปพื้นหลัง (%)"
          hint="100 = ขนาดเดิม, มากกว่า 100 = ซูมเข้า"
          type="number"
          min={100}
          max={300}
          value={String(props.backgroundZoom)}
          onChange={(event) =>
            onChange('props.backgroundZoom', Math.min(300, Math.max(100, Math.round(Number(event.target.value) || 100))))
          }
        />
        <TextField
          label="ตำแหน่งแนวนอนของรูป (%)"
          hint="0 = ชิดซ้าย, 100 = ชิดขวา"
          type="number"
          min={0}
          max={100}
          value={String(props.backgroundX)}
          onChange={(event) =>
            onChange('props.backgroundX', Math.min(100, Math.max(0, Math.round(Number(event.target.value) || 0))))
          }
        />
        <TextField
          label="ตำแหน่งแนวตั้งของรูป (%)"
          hint="0 = ชิดบน, 100 = ชิดล่าง"
          type="number"
          min={0}
          max={100}
          value={String(props.backgroundY)}
          onChange={(event) =>
            onChange('props.backgroundY', Math.min(100, Math.max(0, Math.round(Number(event.target.value) || 0))))
          }
        />
        <TextField
          label="ความเข้มเงามืดทับรูป (%)"
          hint="0 = ไม่มีเงา, 100 = เข้มสุด"
          type="number"
          min={0}
          max={100}
          value={String(props.scrimOpacity)}
          onChange={(event) =>
            onChange('props.scrimOpacity', Math.min(100, Math.max(0, Math.round(Number(event.target.value) || 0))))
          }
        />
      </PanelSection>

      <PanelSection title={`รูปซ้อนบนแบนเนอร์ (${props.foregrounds.length}/${HERO_MAX_FLOATS})`}>
        {props.foregrounds.map((item, index) => (
          <div className="hero-float-editor" key={index}>
            <ImagePicker
              label={`รูปซ้อนที่ ${index + 1}`}
              value={item.image?.src ?? null}
              alt={item.image?.alt ?? ''}
              disabled={!mediaPicker}
              hint={mediaPicker ? undefined : 'ยังไม่ได้เชื่อมคลังรูปภาพในหน้านี้'}
              onPick={() => {
                void mediaPicker
                  ?.pick({ aspect: 'square' })
                  .then((picked) => {
                    if (picked) {
                      updateFloat(index, { image: imageFromPick(picked, item.image?.alt ?? '') });
                    }
                  })
                  .catch(() => undefined);
              }}
              onChange={(url) =>
                updateFloat(index, { image: imageFromUrl(url, item.image?.alt ?? '') })
              }
            />
            <ImagePicker
              label="รูปตอน hover (ไม่บังคับ)"
              value={item.hoverImage?.src ?? null}
              alt={item.hoverImage?.alt ?? ''}
              disabled={!mediaPicker}
              hint={mediaPicker ? 'สลับรูปเมื่อเมาส์ชี้ที่รูปนี้' : 'ยังไม่ได้เชื่อมคลังรูปภาพในหน้านี้'}
              onPick={() => {
                void mediaPicker
                  ?.pick({ aspect: 'square' })
                  .then((picked) => {
                    if (picked) {
                      updateFloat(index, {
                        hoverImage: imageFromPick(picked, item.hoverImage?.alt ?? ''),
                      });
                    }
                  })
                  .catch(() => undefined);
              }}
              onChange={(url) =>
                updateFloat(index, {
                  hoverImage: imageFromUrl(url, item.hoverImage?.alt ?? ''),
                })
              }
            />
            <TextField
              label="คำอธิบายรูป (alt)"
              value={item.image?.alt ?? ''}
              onChange={(event) =>
                updateFloat(index, {
                  image: item.image
                    ? { ...item.image, alt: event.target.value }
                    : { mediaId: '', alt: event.target.value, src: undefined },
                })
              }
            />
            <TextField
              label="ความกว้าง (px)"
              type="number"
              min={0}
              max={2000}
              value={String(item.width)}
              onChange={(event) =>
                updateFloat(index, { width: Math.max(0, Number(event.target.value) || 0) })
              }
            />
            <Select
              label="ยึดด้านซ้าย/ขวา"
              value={item.anchorX}
              options={[
                { value: 'left', label: 'ซ้าย' },
                { value: 'right', label: 'ขวา' },
              ]}
              onChange={(event) => updateFloat(index, { anchorX: event.target.value as 'left' | 'right' })}
            />
            <TextField
              label="ระยะแนวนอน (px)"
              type="number"
              value={String(item.x)}
              onChange={(event) =>
                updateFloat(index, { x: Math.round(Number(event.target.value) || 0) })
              }
            />
            <Select
              label="ยึดด้านบน/ล่าง"
              value={item.anchorY}
              options={[
                { value: 'top', label: 'บน' },
                { value: 'bottom', label: 'ล่าง' },
              ]}
              onChange={(event) => updateFloat(index, { anchorY: event.target.value as 'top' | 'bottom' })}
            />
            <TextField
              label="ระยะแนวตั้ง (px)"
              type="number"
              value={String(item.y)}
              onChange={(event) =>
                updateFloat(index, { y: Math.round(Number(event.target.value) || 0) })
              }
            />
            <Switch
              label="มีเงาใต้รูป"
              checked={item.shadow}
              onChange={(checked) => updateFloat(index, { shadow: checked })}
            />
            <Button
              variant="secondary"
              onClick={() =>
                onChange(
                  'props.foregrounds',
                  props.foregrounds.filter((_, itemIndex) => itemIndex !== index),
                )
              }
            >
              ลบรูปนี้
            </Button>
          </div>
        ))}
        <Button
          variant="secondary"
          disabled={props.foregrounds.length >= HERO_MAX_FLOATS}
          onClick={() =>
            onChange('props.foregrounds', [
              ...props.foregrounds,
              { image: null, width: 360, anchorX: 'right', x: 80, anchorY: 'bottom', y: 0, shadow: true },
            ])
          }
        >
          เพิ่มรูปซ้อน
        </Button>
      </PanelSection>

      <PanelSection title="หน้าตา">
        <Select
          label="ขนาดหัวข้อ"
          value={props.headingSize ?? 'md'}
          options={[
            { value: 'sm', label: 'เล็ก' },
            { value: 'md', label: 'มาตรฐาน' },
            { value: 'lg', label: 'ใหญ่' },
            { value: 'xl', label: 'ใหญ่พิเศษ (แบนเนอร์เต็มจอ)' },
          ]}
          onChange={(event) => onChange('props.headingSize', event.target.value)}
        />
        <Select
          label="ความกว้างเนื้อหาบนแบนเนอร์"
          hint="โหมดกว้างทำให้ข้อความเริ่มใกล้ขอบซ้ายเหมือนเว็บแบรนด์"
          value={props.contentWidth ?? 'normal'}
          options={[
            { value: 'normal', label: 'มาตรฐาน' },
            { value: 'wide', label: 'กว้าง (เต็มจอ)' },
          ]}
          onChange={(event) => onChange('props.contentWidth', event.target.value)}
        />
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
