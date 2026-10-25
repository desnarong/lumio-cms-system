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
  floatWidthPercent,
  floatXPercent,
  floatYPercent,
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
        <TextField
          label="ความกว้างคำอธิบาย (% ของพื้นที่)"
          hint="มีผลกับเลย์เอาต์เต็มเฟรม — รูปซ้าย/ขวาใช้เต็มคอลัมน์ข้อความ"
          type="number"
          min={20}
          max={100}
          value={String(props.subheadingWidth)}
          onChange={(event) =>
            onChange(
              'props.subheadingWidth',
              Math.min(100, Math.max(20, Math.round(Number(event.target.value) || 60))),
            )
          }
        />
        <TextField
          label="ข้อความเพิ่มเติมใต้คำอธิบาย"
          hint="เช่น โปรโมชั่นหรือหมายเหตุการจัดส่ง เว้นว่างได้"
          value={props.note}
          onChange={(event) => onChange('props.note', event.target.value)}
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
        <ImagePicker
          label="รูปเมื่อเอาเมาส์ชี้ (ไม่บังคับ)"
          hint="รูปนี้จะค่อย ๆ ปรากฏทับรูปหลักเมื่อผู้ชมเอาเมาส์ชี้"
          value={props.hoverImage?.src ?? null}
          alt=""
          disabled={!mediaPicker}
          onPick={() => {
            void mediaPicker
              ?.pick({ aspect: 'wide' })
              .then((picked) => {
                if (picked) onChange('props.hoverImage', imageFromPick(picked, ''));
              })
              .catch(() => undefined);
          }}
          onChange={(url) => onChange('props.hoverImage', url ? imageFromUrl(url, '') : null)}
        />
        {props.hoverImage ? (
          <Button variant="ghost" size="sm" onClick={() => onChange('props.hoverImage', null)}>
            ลบรูป hover
          </Button>
        ) : null}
      </PanelSection>

      <PanelSection title="พื้นหลังแบนเนอร์">
        <p className="lumio-panel-hint">
          ลากบนรูปในหน้าจอเพื่อเลื่อนตำแหน่งรูปได้เลย หรือใส่ตัวเลขด้านล่างก็ได้
        </p>
        <Button
          variant="secondary"
          size="sm"
          onClick={() =>
            onChange('style', {
              ...style,
              widthPx: undefined,
              heightPx: undefined,
              paddingXpx: undefined,
              paddingX: 'none',
              offsetX: undefined,
              marginTopPx: undefined,
              backgroundFullWidth: true,
            })
          }
        >
          เต็มจอ (เต็มความกว้าง)
        </Button>
        <p className="lumio-panel-hint">
          ใช้กับเลย์เอาต์ ‘เต็มเฟรม · รูปพื้นหลัง ข้อความทับรูป’ แล้วกดปุ่มนี้เพื่อล้างความกว้าง/ระยะห่างที่ตั้งไว้
          ให้ภาพพื้นหลังกินเต็มขอบจอ
        </p>
        <Select
          label="ตำแหน่งข้อความ (บน–ล่าง)"
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
              label="ความกว้าง (% ของแบนเนอร์)"
              hint="ลากขนาดในหน้าจอได้เลย ค่านี้จะปรับตามความกว้างของแบนเนอร์"
              type="number"
              min={0}
              max={100}
              value={String(Math.round(floatWidthPercent(item)))}
              onChange={(event) =>
                updateFloat(index, {
                  widthPercent: Math.min(100, Math.max(0, Number(event.target.value) || 0)),
                })
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
              label="ระยะแนวนอน (%)"
              hint="เปอร์เซ็นต์ของความกว้างแบนเนอร์"
              type="number"
              value={String(Math.round(floatXPercent(item) * 10) / 10)}
              onChange={(event) =>
                updateFloat(index, { xPercent: Number(event.target.value) || 0 })
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
              label="ระยะแนวตั้ง (%)"
              hint="เปอร์เซ็นต์ของความสูงแบนเนอร์"
              type="number"
              value={String(Math.round(floatYPercent(item) * 10) / 10)}
              onChange={(event) =>
                updateFloat(index, { yPercent: Number(event.target.value) || 0 })
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
              { image: null, width: 360, widthPercent: 25, x: 80, xPercent: 5, anchorX: 'right', anchorY: 'bottom', y: 0, yPercent: 0, shadow: true },
            ])
          }
        >
          เพิ่มรูปซ้อน
        </Button>
      </PanelSection>

      <PanelSection title="การจัดวางแบนเนอร์">
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
          label="การจัดตำแหน่งข้อความ (ซ้าย–ขวา)"
          hint="กึ่งกลางจะจัดหัวข้อ คำอธิบาย และปุ่มให้อยู่กลางพร้อมกัน"
          value={style.textAlign ?? 'left'}
          options={[
            { value: 'left', label: 'ชิดซ้าย' },
            { value: 'center', label: 'กึ่งกลาง' },
            { value: 'right', label: 'ชิดขวา' },
          ]}
          onChange={(event) => onChange('style.textAlign', event.target.value)}
        />
        <TextField
          label="ระยะห่างรูปกับข้อความ (%)"
          hint="ใช้กับเลย์เอาต์รูปซ้าย/ขวา ปรับตามจอบนมือถือ"
          type="number"
          min={0}
          max={20}
          step={0.5}
          value={String(props.splitGap)}
          onChange={(event) =>
            onChange(
              'props.splitGap',
              Math.min(20, Math.max(0, Math.round((Number(event.target.value) || 0) * 2) / 2)),
            )
          }
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
