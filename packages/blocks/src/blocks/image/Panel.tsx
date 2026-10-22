'use client';

import { ImagePicker, Select, Switch, TextField } from '@lumio/ui';
import { useMediaPicker } from '../../engine/media-picker.js';
import { CommonStylePanel, PanelSection } from '../../engine/panel.js';
import type { BlockPanelProps } from '../../types.js';
import { alignmentOptions, imageAspectOptions, imageFromPick, imageFromUrl } from '../common.js';
import type { ImageProps } from './schema.js';

export const ImagePanel = ({ props, style, mode, onChange }: BlockPanelProps<ImageProps>) => {
  const mediaPicker = useMediaPicker();

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

      <PanelSection title="หน้าตา">
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

      <CommonStylePanel style={style} mode={mode} onChange={onChange} />
    </>
  );
};
