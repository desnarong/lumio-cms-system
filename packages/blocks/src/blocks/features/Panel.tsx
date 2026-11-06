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
import { bt } from '../../i18n.js';

const COLUMN_LABELS = (): Record<FeatureColumns, string> => ({
  '2': bt('2 คอลัมน์'),
  '3': bt('3 คอลัมน์'),
  '4': bt('4 คอลัมน์'),
});

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

const ICON_NAME_LABELS = (): Record<FeatureIconName, string> => ({
  sparkles: bt('ประกาย'),
  star: bt('ดาว'),
  grid: bt('หมวดสินค้า'),
  package: bt('จัดส่ง / พัสดุ'),
  sun: bt('แสงสว่าง'),
  zap: bt('ประหยัดไฟ'),
  layers: bt('หลายชั้น'),
  check: bt('ยืนยัน'),
  home: bt('บ้าน'),
  settings: bt('บริการ / ติดตั้ง'),
  users: bt('ทีมงาน'),
  mail: bt('ติดต่อ'),
  'map-pin': bt('ที่อยู่'),
  book: bt('คู่มือ'),
  tag: bt('โปรโมชั่น'),
  shield: bt('มาตรฐาน'),
  globe: bt('ออนไลน์'),
  clock: bt('เวลา'),
  play: bt('วิดีโอ'),
  image: bt('รูปภาพ'),
});

const ICON_NAME_OPTIONS = () => [
  { value: '', label: bt('ไม่ใช้ (แสดงอีโมจิ)') },
  ...FEATURE_ICON_NAMES.map((name) => ({ value: name, label: ICON_NAME_LABELS()[name] })),
];

const MEDIA_FIT_OPTIONS = FEATURE_MEDIA_FITS.map((fit) => ({
  value: fit,
  label: fit === 'cover' ? bt('ขยายเต็มกรอบ (zoom)') : bt('แสดงทั้งภาพ (ไม่ครอป)'),
}));

const MEDIA_POSITION_OPTIONS = FEATURE_MEDIA_POSITIONS.map((position) => ({
  value: position,
  label: position === 'center' ? bt('กึ่งกลาง') : position === 'top' ? bt('ชิดบน') : bt('ชิดล่าง'),
}));

const newItem = (): FeatureItem => ({
  icon: '★',
  showIcon: true,
  iconName: '',
  iconImage: null,
  iconSize: 48,
  title: bt('จุดเด่นใหม่'),
  description: bt('อธิบายสั้น ๆ ว่าลูกค้าได้อะไรจากจุดเด่นนี้'),
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
      <PanelSection title={bt('เนื้อหา')}>
        <TextField
          label={bt('หัวข้อส่วน')}
          value={props.heading}
          onChange={(event) => onChange('props.heading', event.target.value)}
        />
        <TextField
          label={bt('คำอธิบายส่วน')}
          value={props.subheading}
          onChange={(event) => onChange('props.subheading', event.target.value)}
        />
        <Select
          label={bt('ความกว้างคำอธิบาย')}
          hint={bt('ขยายออกด้านข้างได้ ถ้าไม่ต้องการให้ตัดเป็น 2 บรรทัด')}
          value={props.subheadingWidth ?? 'normal'}
          options={[
            { value: 'normal', label: bt('มาตรฐาน') },
            { value: 'wide', label: bt('กว้าง') },
            { value: 'full', label: bt('เต็มความกว้าง') },
          ]}
          onChange={(event) => onChange('props.subheadingWidth', event.target.value)}
        />
        <Select
          label={bt('แหล่งเนื้อหา')}
          hint={bt('เลือกโปรโมชั่นเพื่อให้รายการอัปเดตเองตามวันที่และสถานะเปิด/ปิด')}
          value={props.source}
          options={[
            { value: 'manual', label: bt('เขียนการ์ดเอง') },
            { value: 'promotions', label: bt('โปรโมชั่นที่กำลังเปิด') },
          ]}
          onChange={(event) => onChange('props.source', event.target.value)}
        />
        <Select
          label={bt('จำนวนคอลัมน์')}
          value={props.columns}
          options={FEATURE_COLUMNS.map((column) => ({
            value: column,
            label: COLUMN_LABELS()[column],
          }))}
          onChange={(event) => onChange('props.columns', event.target.value)}
        />
      </PanelSection>

      {props.source === 'promotions' ? (
        <PanelSection title={bt('โปรโมชั่นที่แสดง')}>
          <p className="lumio-panel-hint">
            {bt(
              'การ์ดจะมาจากโปรโมชั่นที่เปิดอยู่และยังไม่หมดอายุ จัดการรายการได้ที่ ร้านค้า › โปรโมชั่น',
            )}
          </p>
          <TextField
            label={bt('จำนวนที่แสดง')}
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
        <PanelSection title={bt('จุดเด่น')}>
          <PanelItemList
            items={props.items}
            addLabel={bt('เพิ่มจุดเด่น')}
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
                    label={bt('รูปประกอบ (เต็มความกว้างการ์ด)')}
                    value={item.image?.src ?? null}
                    alt={item.image?.alt ?? ''}
                    disabled={!mediaPicker}
                    hint={mediaPicker ? undefined : bt('ยังไม่ได้เชื่อมคลังรูปภาพในหน้านี้')}
                    onPick={() => {
                      void mediaPicker
                        ?.pick({ aspect: 'wide' })
                        .then((picked) => {
                          if (picked) {
                            updateItem(index, {
                              image: imageFromPick(picked, item.image?.alt ?? ''),
                            });
                          }
                        })
                        .catch(() => undefined);
                    }}
                    onChange={(url) =>
                      updateItem(index, { image: imageFromUrl(url, item.image?.alt ?? '') })
                    }
                  />
                  <ImagePicker
                    label={bt('รูปตอน hover (ไม่บังคับ)')}
                    value={item.hoverImage?.src ?? null}
                    alt={item.hoverImage?.alt ?? ''}
                    disabled={!mediaPicker}
                    hint={
                      mediaPicker
                        ? bt('เปลี่ยนรูปเมื่อเมาส์ชี้ที่การ์ด')
                        : bt('ยังไม่ได้เชื่อมคลังรูปภาพในหน้านี้')
                    }
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
                    label={bt('สัดส่วนรูป')}
                    value={item.mediaAspect ?? 'wide'}
                    options={imageAspectOptions()}
                    onChange={(event) =>
                      updateItem(index, {
                        mediaAspect: event.target.value as FeatureItem['mediaAspect'],
                      })
                    }
                  />
                  <Select
                    label={bt('การแสดงรูป')}
                    value={item.mediaFit ?? 'cover'}
                    options={MEDIA_FIT_OPTIONS}
                    onChange={(event) =>
                      updateItem(index, { mediaFit: event.target.value as FeatureItem['mediaFit'] })
                    }
                  />
                  <Select
                    label={bt('จุดโฟกัสของรูป')}
                    value={item.mediaPosition ?? 'center'}
                    options={MEDIA_POSITION_OPTIONS}
                    onChange={(event) =>
                      updateItem(index, {
                        mediaPosition: event.target.value as FeatureItem['mediaPosition'],
                      })
                    }
                  />
                  <Switch
                    label={bt('แสดงไอคอน')}
                    checked={item.showIcon !== false}
                    onChange={(checked) => updateItem(index, { showIcon: checked })}
                  />
                  <TextField
                    label={bt('ขนาดไอคอน (px)')}
                    type="number"
                    min={16}
                    max={160}
                    value={String(item.iconSize ?? 48)}
                    onChange={(event) =>
                      updateItem(index, {
                        iconSize: Math.min(
                          160,
                          Math.max(16, Math.round(Number(event.target.value) || 48)),
                        ),
                      })
                    }
                  />
                  <ImagePicker
                    label={bt('รูปไอคอน (ไม่บังคับ)')}
                    value={item.iconImage?.src ?? null}
                    alt={item.iconImage?.alt ?? ''}
                    disabled={!mediaPicker}
                    hint={mediaPicker ? undefined : bt('ยังไม่ได้เชื่อมคลังรูปภาพในหน้านี้')}
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
                    label={bt('คำอธิบายรูปไอคอน (alt)')}
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
                    label={bt('ไอคอนเส้น (แนะนำ)')}
                    value={item.iconName ?? ''}
                    options={ICON_NAME_OPTIONS()}
                    onChange={(event) =>
                      updateItem(index, {
                        iconName: event.target.value as FeatureItem['iconName'],
                      })
                    }
                  />
                  <Select
                    label={bt('อีโมจิสำรอง')}
                    value={item.icon}
                    options={iconOptions}
                    onChange={(event) => updateItem(index, { icon: event.target.value })}
                  />
                  <TextField
                    label={bt('หรือพิมพ์อีโมจิเอง')}
                    value={item.icon}
                    onChange={(event) => updateItem(index, { icon: event.target.value })}
                  />
                  <TextField
                    label={bt('ชื่อจุดเด่น')}
                    value={item.title}
                    onChange={(event) => updateItem(index, { title: event.target.value })}
                  />
                  <Textarea
                    label={bt('คำอธิบาย')}
                    rows={3}
                    value={item.description}
                    onChange={(event) => updateItem(index, { description: event.target.value })}
                  />
                  <TextField
                    label={bt('ลิงก์ปลายทาง (ไม่บังคับ)')}
                    hint={bt('เช่น /product หรือ https://...')}
                    value={item.link}
                    onChange={(event) => updateItem(index, { link: event.target.value })}
                  />
                  <TextField
                    label={bt('ข้อความบนปุ่ม (ไม่บังคับ)')}
                    hint={bt('เว้นว่าง = ไม่มีปุ่ม แต่คลิกทั้งการ์ดได้')}
                    value={item.buttonLabel}
                    onChange={(event) => updateItem(index, { buttonLabel: event.target.value })}
                  />
                </>
              );
            }}
          </PanelItemList>
        </PanelSection>
      )}

      <PanelSection title={bt('การ์ด')}>
        <Select
          label={bt('รูปแบบการ์ด')}
          value={props.cardStyle ?? 'card'}
          options={[
            { value: 'card', label: bt('การ์ดมีขอบ') },
            { value: 'plain', label: bt('เรียบ (ภาพกับข้อความชิดกัน)') },
          ]}
          onChange={(event) => onChange('props.cardStyle', event.target.value)}
        />
        <Select
          label={bt('ระยะห่างระหว่างการ์ด')}
          hint={bt('เลือก “ชิดกัน” เพื่อวางการ์ดติดกันแบบตัวอย่าง')}
          value={props.cardGap ?? 'lg'}
          options={[
            { value: 'none', label: bt('ชิดกัน (ไม่มีช่องว่าง)') },
            { value: 'sm', label: bt('เล็ก') },
            { value: 'md', label: bt('ปานกลาง') },
            { value: 'lg', label: bt('กว้าง (มาตรฐาน)') },
          ]}
          onChange={(event) => onChange('props.cardGap', event.target.value)}
        />
        <Select
          label={bt('ตำแหน่งข้อความและไอคอน')}
          value={props.contentAlign ?? 'left'}
          options={[
            { value: 'left', label: bt('ชิดซ้าย') },
            { value: 'center', label: bt('กึ่งกลาง') },
            { value: 'right', label: bt('ชิดขวา') },
          ]}
          onChange={(event) => onChange('props.contentAlign', event.target.value)}
        />
        <Switch
          label={bt('วางข้อความบนรูป')}
          checked={props.textOverlay ?? false}
          onChange={(checked) => onChange('props.textOverlay', checked)}
        />
        <Switch
          label={bt('เต็มความกว้างจอ (100%)')}
          checked={props.fullWidth ?? false}
          onChange={(checked) => onChange('props.fullWidth', checked)}
        />
        <TextField
          label={bt('ความสูงการ์ด (px)')}
          hint={bt('0 = สูงตามเนื้อหา')}
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
          label={bt('พื้นหลังข้อความ')}
          value={
            props.textBackground === true
              ? 'panel'
              : props.textBackground === false
                ? 'none'
                : (props.textBackground ?? 'none')
          }
          options={[
            { value: 'none', label: bt('ไม่มีพื้นหลัง') },
            { value: 'panel', label: bt('แผงข้อความ') },
            { value: 'full', label: bt('เต็มซ้าย-ขวาการ์ด') },
            { value: 'fade', label: bt('ไล่จางจากด้านบน') },
          ]}
          onChange={(event) => onChange('props.textBackground', event.target.value)}
        />
        <Switch
          label={bt('ข้อความชิดขอบล่าง')}
          checked={props.textFlushBottom ?? false}
          onChange={(checked) => onChange('props.textFlushBottom', checked)}
        />
        <Select
          label={bt('ข้อความบนปุ่ม')}
          value={props.buttonVisibility ?? 'always'}
          options={[
            { value: 'always', label: bt('แสดงตลอด') },
            { value: 'hover', label: bt('แสดงตอน hover') },
          ]}
          onChange={(event) => onChange('props.buttonVisibility', event.target.value)}
        />
      </PanelSection>

      <CommonStylePanel style={style} mode={mode} onChange={onChange} />
    </>
  );
};
