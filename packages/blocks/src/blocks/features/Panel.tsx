'use client';

import { ImagePicker, Select, Switch, TextField, Textarea } from '@lumio/ui';
import { useMediaPicker } from '../../engine/media-picker.js';
import { CommonStylePanel, PanelItemList, PanelSection } from '../../engine/panel.js';
import type { BlockPanelProps } from '../../types.js';
import { imageAspectOptions, imageFromPick, imageFromUrl } from '../common.js';
import {
  FEATURES_MAX_ITEMS,
  FEATURE_COLUMNS,
  FEATURE_ICON_NAMES,
  FEATURE_MEDIA_FITS,
  FEATURE_MEDIA_POSITIONS,
  type FeatureColumns,
  type FeatureIconName,
  type FeatureItem,
  type FeaturesProps,
} from './schema.js';

const COLUMN_LABELS: Record<FeatureColumns, string> = {
  '2': '2 คอลัมน์',
  '3': '3 คอลัมน์',
  '4': '4 คอลัมน์',
};

const ICON_OPTIONS = [
  '★',
  '☕',
  '🚚',
  '💬',
  '💡',
  '🔆',
  '✨',
  '✅',
  '🏅',
  '⚡',
  '🎁',
  '🛠️',
  '📞',
  '✉️',
  '📍',
  '📘',
  '🏠',
].map((icon) => ({ value: icon, label: icon }));

const ICON_NAME_LABELS: Record<FeatureIconName, string> = {
  sparkles: 'ประกาย',
  star: 'ดาว',
  grid: 'หมวดสินค้า',
  package: 'จัดส่ง / พัสดุ',
  sun: 'แสงสว่าง',
  zap: 'ประหยัดไฟ',
  layers: 'หลายชั้น',
  check: 'ยืนยัน',
  home: 'บ้าน',
  settings: 'บริการ / ติดตั้ง',
  users: 'ทีมงาน',
  mail: 'ติดต่อ',
  'map-pin': 'ที่อยู่',
  book: 'คู่มือ',
  tag: 'โปรโมชั่น',
  shield: 'มาตรฐาน',
  globe: 'ออนไลน์',
  clock: 'เวลา',
  play: 'วิดีโอ',
  image: 'รูปภาพ',
};

const ICON_NAME_OPTIONS = [
  { value: '', label: 'ไม่ใช้ (แสดงอีโมจิ)' },
  ...FEATURE_ICON_NAMES.map((name) => ({ value: name, label: ICON_NAME_LABELS[name] })),
];

const MEDIA_FIT_OPTIONS = FEATURE_MEDIA_FITS.map((fit) => ({
  value: fit,
  label: fit === 'cover' ? 'ขยายเต็มกรอบ (zoom)' : 'แสดงทั้งภาพ (ไม่ครอป)',
}));

const MEDIA_POSITION_OPTIONS = FEATURE_MEDIA_POSITIONS.map((position) => ({
  value: position,
  label: position === 'center' ? 'กึ่งกลาง' : position === 'top' ? 'ชิดบน' : 'ชิดล่าง',
}));

const newItem = (): FeatureItem => ({
  icon: '★',
  showIcon: true,
  iconName: '',
  iconImage: null,
  iconSize: 48,
  title: 'จุดเด่นใหม่',
  description: 'อธิบายสั้น ๆ ว่าลูกค้าได้อะไรจากจุดเด่นนี้',
  image: null,
  hoverImage: null,
  mediaAspect: 'wide',
  mediaFit: 'cover',
  mediaPosition: 'center',
  link: '',
  buttonLabel: '',
});

export const FeaturesPanel = ({ props, style, mode, onChange }: BlockPanelProps<FeaturesProps>) => {
  const mediaPicker = useMediaPicker();

  const updateItem = (index: number, patch: Partial<FeatureItem>): void => {
    onChange(
      'props.items',
      props.items.map((item, itemIndex) => (itemIndex === index ? { ...item, ...patch } : item)),
    );
  };

  return (
    <>
      <PanelSection title="เนื้อหา">
        <TextField
          label="หัวข้อส่วน"
          value={props.heading}
          onChange={(event) => onChange('props.heading', event.target.value)}
        />
        <TextField
          label="คำอธิบายส่วน"
          value={props.subheading}
          onChange={(event) => onChange('props.subheading', event.target.value)}
        />
        <Select
          label="ความกว้างคำอธิบาย"
          hint="ขยายออกด้านข้างได้ ถ้าไม่ต้องการให้ตัดเป็น 2 บรรทัด"
          value={props.subheadingWidth ?? 'normal'}
          options={[
            { value: 'normal', label: 'มาตรฐาน' },
            { value: 'wide', label: 'กว้าง' },
            { value: 'full', label: 'เต็มความกว้าง' },
          ]}
          onChange={(event) => onChange('props.subheadingWidth', event.target.value)}
        />
        <Select
          label="แหล่งเนื้อหา"
          hint="เลือกโปรโมชั่นเพื่อให้รายการอัปเดตเองตามวันที่และสถานะเปิด/ปิด"
          value={props.source}
          options={[
            { value: 'manual', label: 'เขียนการ์ดเอง' },
            { value: 'promotions', label: 'โปรโมชั่นที่กำลังเปิด' },
          ]}
          onChange={(event) => onChange('props.source', event.target.value)}
        />
        <Select
          label="จำนวนคอลัมน์"
          value={props.columns}
          options={FEATURE_COLUMNS.map((column) => ({
            value: column,
            label: COLUMN_LABELS[column],
          }))}
          onChange={(event) => onChange('props.columns', event.target.value)}
        />
      </PanelSection>

      {props.source === 'promotions' ? (
        <PanelSection title="โปรโมชั่นที่แสดง">
          <p className="lumio-panel-hint">
            การ์ดจะมาจากโปรโมชั่นที่เปิดอยู่และยังไม่หมดอายุ จัดการรายการได้ที่ ร้านค้า › โปรโมชั่น
          </p>
          <TextField
            label="จำนวนที่แสดง"
            type="number"
            min={1}
            max={FEATURES_MAX_ITEMS}
            value={String(props.sourceLimit)}
            onChange={(event) =>
              onChange(
                'props.sourceLimit',
                Math.min(
                  FEATURES_MAX_ITEMS,
                  Math.max(1, Math.round(Number(event.target.value) || 3)),
                ),
              )
            }
          />
        </PanelSection>
      ) : (
      <PanelSection title="จุดเด่น">
        <PanelItemList
          items={props.items}
          addLabel="เพิ่มจุดเด่น"
          max={FEATURES_MAX_ITEMS}
          create={newItem}
          onChange={(items) => onChange('props.items', items)}
        >
          {(index) => {
            const item = props.items[index];
            if (!item) {
              return null;
            }
            const iconOptions = ICON_OPTIONS.some((option) => option.value === item.icon)
              ? ICON_OPTIONS
              : [{ value: item.icon, label: item.icon }, ...ICON_OPTIONS];
            return (
              <>
                <ImagePicker
                  label="รูปประกอบ (เต็มความกว้างการ์ด)"
                  value={item.image?.src ?? null}
                  alt={item.image?.alt ?? ''}
                  disabled={!mediaPicker}
                  hint={mediaPicker ? undefined : 'ยังไม่ได้เชื่อมคลังรูปภาพในหน้านี้'}
                  onPick={() => {
                    void mediaPicker
                      ?.pick({ aspect: 'wide' })
                      .then((picked) => {
                        if (picked) {
                          updateItem(index, { image: imageFromPick(picked, item.image?.alt ?? '') });
                        }
                      })
                      .catch(() => undefined);
                  }}
                  onChange={(url) =>
                    updateItem(index, { image: imageFromUrl(url, item.image?.alt ?? '') })
                  }
                />
                <ImagePicker
                  label="รูปตอน hover (ไม่บังคับ)"
                  value={item.hoverImage?.src ?? null}
                  alt={item.hoverImage?.alt ?? ''}
                  disabled={!mediaPicker}
                  hint={mediaPicker ? 'เปลี่ยนรูปเมื่อเมาส์ชี้ที่การ์ด' : 'ยังไม่ได้เชื่อมคลังรูปภาพในหน้านี้'}
                  onPick={() => {
                    void mediaPicker
                      ?.pick({ aspect: 'wide' })
                      .then((picked) => {
                        if (picked) {
                          updateItem(index, {
                            hoverImage: imageFromPick(picked, item.hoverImage?.alt ?? ''),
                          });
                        }
                      })
                      .catch(() => undefined);
                  }}
                  onChange={(url) =>
                    updateItem(index, {
                      hoverImage: imageFromUrl(url, item.hoverImage?.alt ?? ''),
                    })
                  }
                />
                <Select
                  label="สัดส่วนรูป"
                  value={item.mediaAspect ?? 'wide'}
                  options={imageAspectOptions}
                  onChange={(event) =>
                    updateItem(index, {
                      mediaAspect: event.target.value as FeatureItem['mediaAspect'],
                    })
                  }
                />
                <Select
                  label="การแสดงรูป"
                  value={item.mediaFit ?? 'cover'}
                  options={MEDIA_FIT_OPTIONS}
                  onChange={(event) =>
                    updateItem(index, { mediaFit: event.target.value as FeatureItem['mediaFit'] })
                  }
                />
                <Select
                  label="จุดโฟกัสของรูป"
                  value={item.mediaPosition ?? 'center'}
                  options={MEDIA_POSITION_OPTIONS}
                  onChange={(event) =>
                    updateItem(index, {
                      mediaPosition: event.target.value as FeatureItem['mediaPosition'],
                    })
                  }
                />
                <Switch
                  label="แสดงไอคอน"
                  checked={item.showIcon !== false}
                  onChange={(checked) => updateItem(index, { showIcon: checked })}
                />
                <TextField
                  label="ขนาดไอคอน (px)"
                  type="number"
                  min={16}
                  max={160}
                  value={String(item.iconSize ?? 48)}
                  onChange={(event) =>
                    updateItem(index, {
                      iconSize: Math.min(160, Math.max(16, Math.round(Number(event.target.value) || 48))),
                    })
                  }
                />
                <ImagePicker
                  label="รูปไอคอน (ไม่บังคับ)"
                  value={item.iconImage?.src ?? null}
                  alt={item.iconImage?.alt ?? ''}
                  disabled={!mediaPicker}
                  hint={mediaPicker ? undefined : 'ยังไม่ได้เชื่อมคลังรูปภาพในหน้านี้'}
                  onPick={() => {
                    void mediaPicker
                      ?.pick({ aspect: 'square' })
                      .then((picked) => {
                        if (picked) {
                          updateItem(index, {
                            iconImage: imageFromPick(picked, item.iconImage?.alt ?? ''),
                          });
                        }
                      })
                      .catch(() => undefined);
                  }}
                  onChange={(url) =>
                    updateItem(index, {
                      iconImage: imageFromUrl(url, item.iconImage?.alt ?? ''),
                    })
                  }
                />
                <TextField
                  label="คำอธิบายรูปไอคอน (alt)"
                  value={item.iconImage?.alt ?? ''}
                  onChange={(event) =>
                    updateItem(index, {
                      iconImage: item.iconImage
                        ? { ...item.iconImage, alt: event.target.value }
                        : { mediaId: '', alt: event.target.value },
                    })
                  }
                />
                <Select
                  label="ไอคอนเส้น (แนะนำ)"
                  value={item.iconName ?? ''}
                  options={ICON_NAME_OPTIONS}
                  onChange={(event) =>
                    updateItem(index, {
                      iconName: event.target.value as FeatureItem['iconName'],
                    })
                  }
                />
                <Select
                  label="อีโมจิสำรอง"
                  value={item.icon}
                  options={iconOptions}
                  onChange={(event) => updateItem(index, { icon: event.target.value })}
                />
                <TextField
                  label="หรือพิมพ์อีโมจิเอง"
                  value={item.icon}
                  onChange={(event) => updateItem(index, { icon: event.target.value })}
                />
                <TextField
                  label="ชื่อจุดเด่น"
                  value={item.title}
                  onChange={(event) => updateItem(index, { title: event.target.value })}
                />
                <Textarea
                  label="คำอธิบาย"
                  rows={3}
                  value={item.description}
                  onChange={(event) => updateItem(index, { description: event.target.value })}
                />
                <TextField
                  label="ลิงก์ปลายทาง (ไม่บังคับ)"
                  hint="เช่น /product หรือ https://..."
                  value={item.link}
                  onChange={(event) => updateItem(index, { link: event.target.value })}
                />
                <TextField
                  label="ข้อความบนปุ่ม (ไม่บังคับ)"
                  hint="เว้นว่าง = ไม่มีปุ่ม แต่คลิกทั้งการ์ดได้"
                  value={item.buttonLabel}
                  onChange={(event) => updateItem(index, { buttonLabel: event.target.value })}
                />
              </>
            );
          }}
        </PanelItemList>
      </PanelSection>
      )}

      <PanelSection title="การ์ด">
        <Select
          label="รูปแบบการ์ด"
          value={props.cardStyle ?? 'card'}
          options={[
            { value: 'card', label: 'การ์ดมีขอบ' },
            { value: 'plain', label: 'เรียบ (ภาพกับข้อความชิดกัน)' },
          ]}
          onChange={(event) => onChange('props.cardStyle', event.target.value)}
        />
        <Select
          label="ระยะห่างระหว่างการ์ด"
          hint="เลือก “ชิดกัน” เพื่อวางการ์ดติดกันแบบตัวอย่าง"
          value={props.cardGap ?? 'lg'}
          options={[
            { value: 'none', label: 'ชิดกัน (ไม่มีช่องว่าง)' },
            { value: 'sm', label: 'เล็ก' },
            { value: 'md', label: 'ปานกลาง' },
            { value: 'lg', label: 'กว้าง (มาตรฐาน)' },
          ]}
          onChange={(event) => onChange('props.cardGap', event.target.value)}
        />
        <Select
          label="ตำแหน่งข้อความและไอคอน"
          value={props.contentAlign ?? 'left'}
          options={[
            { value: 'left', label: 'ชิดซ้าย' },
            { value: 'center', label: 'กึ่งกลาง' },
            { value: 'right', label: 'ชิดขวา' },
          ]}
          onChange={(event) => onChange('props.contentAlign', event.target.value)}
        />
        <Switch
          label="วางข้อความบนรูป"
          checked={props.textOverlay ?? false}
          onChange={(checked) => onChange('props.textOverlay', checked)}
        />
        <Switch
          label="เต็มความกว้างจอ (100%)"
          checked={props.fullWidth ?? false}
          onChange={(checked) => onChange('props.fullWidth', checked)}
        />
        <TextField
          label="ความสูงการ์ด (px)"
          hint="0 = สูงตามเนื้อหา"
          type="number"
          min={0}
          max={1200}
          value={String(props.cardHeight ?? 0)}
          onChange={(event) =>
            onChange(
              'props.cardHeight',
              Math.min(1200, Math.max(0, Math.round(Number(event.target.value) || 0))),
            )
          }
        />
        <Select
          label="พื้นหลังข้อความ"
          value={
            props.textBackground === true
              ? 'panel'
              : props.textBackground === false
                ? 'none'
                : (props.textBackground ?? 'none')
          }
          options={[
            { value: 'none', label: 'ไม่มีพื้นหลัง' },
            { value: 'panel', label: 'แผงข้อความ' },
            { value: 'full', label: 'เต็มซ้าย-ขวาการ์ด' },
            { value: 'fade', label: 'ไล่จางจากด้านบน' },
          ]}
          onChange={(event) => onChange('props.textBackground', event.target.value)}
        />
        <Switch
          label="ข้อความชิดขอบล่าง"
          checked={props.textFlushBottom ?? false}
          onChange={(checked) => onChange('props.textFlushBottom', checked)}
        />
        <Select
          label="ข้อความบนปุ่ม"
          value={props.buttonVisibility ?? 'always'}
          options={[
            { value: 'always', label: 'แสดงตลอด' },
            { value: 'hover', label: 'แสดงตอน hover' },
          ]}
          onChange={(event) => onChange('props.buttonVisibility', event.target.value)}
        />
      </PanelSection>

      <CommonStylePanel style={style} mode={mode} onChange={onChange} />
    </>
  );
};
