'use client';

import { Button, Icon, ImagePicker, Select, Slider, Switch, TextField } from '@lumio/ui';
import { useMediaPicker } from '../../engine/media-picker.js';
import { CommonStylePanel, PanelSection } from '../../engine/panel.js';
import type { BlockPanelProps } from '../../types.js';
import { alignmentOptions, imageAspectOptions, imageFromPick, imageFromUrl } from '../common.js';
import type { ImageProps } from './schema.js';

const clampPercent = (value: number): number => Math.min(1, Math.max(0, value));

export const ImagePanel = ({ props, style, mode, onChange }: BlockPanelProps<ImageProps>) => {
  const mediaPicker = useMediaPicker();
  const image = props.image;
  const focal = image?.focalPoint ?? { x: 0.5, y: 0.5 };

  const setCrop = (patch: { x?: number; y?: number }): void => {
    if (!image) return;
    onChange('props.image', {
      ...image,
      focalPoint: {
        x: clampPercent(patch.x ?? focal.x),
        y: clampPercent(patch.y ?? focal.y),
      },
    });
  };

  const nudge = (dx: number, dy: number): void => {
    setCrop({
      x: Math.round(clampPercent(focal.x + dx) * 100) / 100,
      y: Math.round(clampPercent(focal.y + dy) * 100) / 100,
    });
  };

  return (
    <>
      <PanelSection title="เนื้อหา">
        <ImagePicker
          label="รูปภาพ"
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
          hint="ช่วยให้ผู้ใช้โปรแกรมอ่านหน้าจอเข้าใจรูป และช่วยเรื่อง SEO"
          value={props.image?.alt ?? ''}
          onChange={(event) => {
            const alt = event.target.value;
            onChange(
              'props.image',
              props.image ? { ...props.image, alt } : { mediaId: '', alt, src: undefined },
            );
          }}
        />
        <TextField
          label="คำบรรยายใต้ภาพ"
          value={props.caption}
          onChange={(event) => onChange('props.caption', event.target.value)}
        />
      </PanelSection>

      <PanelSection title="รูปแบบภาพ">
        <Select
          label="สัดส่วนภาพ"
          value={props.aspect}
          options={imageAspectOptions}
          onChange={(event) => onChange('props.aspect', event.target.value)}
        />
        <Select
          label="การจัดวาง"
          value={props.align}
          options={alignmentOptions}
          onChange={(event) => onChange('props.align', event.target.value)}
        />
        <Switch
          label="มุมโค้ง"
          checked={props.rounded}
          onChange={(checked) => onChange('props.rounded', checked)}
        />
      </PanelSection>

      <PanelSection title="ครอปรูป">
        <p className="lumio-panel-hint">
          ลากรูปบนหน้าก็ได้ หรือใช้แถบด้านล่างเพื่อเลือกส่วนที่ต้องการให้อยู่ในกรอบ
        </p>
        <Slider
          label="ซูมรูป (%)"
          min={100}
          max={300}
          step={5}
          value={props.zoom}
          formatValue={(value) => `${value}%`}
          disabled={!image}
          onChange={(value) => onChange('props.zoom', value)}
        />
        <Slider
          label="ตำแหน่งแนวนอน (%)"
          min={0}
          max={100}
          step={1}
          value={Math.round(focal.x * 100)}
          disabled={!image}
          onChange={(value) => setCrop({ x: value / 100 })}
        />
        <Slider
          label="ตำแหน่งแนวตั้ง (%)"
          min={0}
          max={100}
          step={1}
          value={Math.round(focal.y * 100)}
          disabled={!image}
          onChange={(value) => setCrop({ y: value / 100 })}
        />
        <div className="lumio-panel-nudge" role="group" aria-label="เลื่อนตำแหน่งรูป">
          <Button
            type="button"
            variant="secondary"
            size="sm"
            aria-label="เลื่อนรูปขึ้น"
            disabled={!image}
            onClick={() => nudge(0, -0.05)}
          >
            <Icon name="arrow-up" size={16} />
          </Button>
          <Button
            type="button"
            variant="secondary"
            size="sm"
            aria-label="เลื่อนรูปลง"
            disabled={!image}
            onClick={() => nudge(0, 0.05)}
          >
            <Icon name="arrow-down" size={16} />
          </Button>
          <Button
            type="button"
            variant="secondary"
            size="sm"
            aria-label="เลื่อนรูปไปทางซ้าย"
            disabled={!image}
            onClick={() => nudge(-0.05, 0)}
          >
            <Icon name="arrow-left" size={16} />
          </Button>
          <Button
            type="button"
            variant="secondary"
            size="sm"
            aria-label="เลื่อนรูปไปทางขวา"
            disabled={!image}
            onClick={() => nudge(0.05, 0)}
          >
            <Icon name="arrow-right" size={16} />
          </Button>
        </div>
        {image ? (
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={() => {
              onChange('props.zoom', 100);
              onChange('props.image', { ...image, focalPoint: { x: 0.5, y: 0.5 } });
            }}
          >
            คืนค่าครอปเดิม
          </Button>
        ) : null}
      </PanelSection>

      <CommonStylePanel style={style} mode={mode} onChange={onChange} />
    </>
  );
};
