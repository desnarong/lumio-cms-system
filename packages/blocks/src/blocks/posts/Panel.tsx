'use client';

import { ImagePicker, Select, Switch, TextField, Textarea } from '@lumio/ui';
import { useMediaPicker } from '../../engine/media-picker.js';
import { CommonStylePanel, PanelItemList, PanelSection } from '../../engine/panel.js';
import type { BlockPanelProps } from '../../types.js';
import { imageFromPick, imageFromUrl } from '../common.js';
import {
  POSTS_MAX_ITEMS,
  POST_COLUMNS,
  POST_SOURCES,
  type PostCard,
  type PostColumns,
  type PostSource,
  type PostsProps,
} from './schema.js';
import { bt } from '../../i18n.js';

const SOURCE_LABELS = (): Record<PostSource, string> => ({
  manual: bt('เขียนการ์ดเอง'),
  latest: bt('บทความล่าสุดจากเว็บ'),
});

const COLUMN_LABELS = (): Record<PostColumns, string> => ({
  '1': bt('1 คอลัมน์'),
  '2': bt('2 คอลัมน์'),
  '3': bt('3 คอลัมน์'),
  '4': bt('4 คอลัมน์'),
});

const newPost = (): PostCard => ({
  image: null,
  category: bt('บทความ'),
  title: bt('หัวข้อบทความใหม่'),
  excerpt: bt('เกริ่นนำสั้น ๆ ให้ผู้อ่านอยากกดอ่านต่อ'),
  date: '',
  author: '',
  link: '/posts',
  buttonLabel: bt('อ่านต่อ'),
});

export const PostsPanel = ({ props, style, mode, onChange }: BlockPanelProps<PostsProps>) => {
  const mediaPicker = useMediaPicker();

  const updateItem = (index: number, patch: Partial<PostCard>): void => {
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
          label={bt('แหล่งบทความ')}
          hint={bt('เลือกดึงบทความล่าสุดเพื่อให้บทความใหม่ขึ้นเอง และบทความที่ลบแล้วหายไปเอง')}
          value={props.source}
          options={POST_SOURCES.map((source) => ({
            value: source,
            label: SOURCE_LABELS()[source],
          }))}
          onChange={(event) => onChange('props.source', event.target.value)}
        />
        <Select
          label={bt('จำนวนคอลัมน์')}
          value={props.columns}
          options={POST_COLUMNS.map((column) => ({
            value: column,
            label: COLUMN_LABELS()[column],
          }))}
          onChange={(event) => onChange('props.columns', event.target.value)}
        />
        <Switch
          label={bt('แสดงรูปภาพ')}
          checked={props.showImage}
          onChange={(checked) => onChange('props.showImage', checked)}
        />
        <Switch
          label={bt('แสดงเกริ่นนำ')}
          checked={props.showExcerpt}
          onChange={(checked) => onChange('props.showExcerpt', checked)}
        />
        <Switch
          label={bt('แสดงวันที่')}
          checked={props.showDate}
          onChange={(checked) => onChange('props.showDate', checked)}
        />
      </PanelSection>

      {props.source === 'latest' ? (
        <PanelSection title={bt('บทความล่าสุดจากเว็บ')}>
          <p className="lumio-panel-hint">
            {bt('บทความที่เผยแพร่จะขึ้นตรงนี้อัตโนมัติ บทความที่ย้ายไปถังขยะหรือลบแล้วจะไม่แสดง')}
          </p>
          <TextField
            label={bt('จำนวนบทความที่แสดง')}
            type="number"
            min={1}
            max={POSTS_MAX_ITEMS}
            value={String(props.sourceLimit)}
            onChange={(event) =>
              onChange(
                'props.sourceLimit',
                Math.min(POSTS_MAX_ITEMS, Math.max(1, Math.round(Number(event.target.value) || 3))),
              )
            }
          />
        </PanelSection>
      ) : (
        <PanelSection
          title={bt('บทความ ({length}/{POSTS_MAX_ITEMS})', undefined, {
            length: props.items.length,
            POSTS_MAX_ITEMS: POSTS_MAX_ITEMS,
          })}
        >
          <PanelItemList
            items={props.items}
            addLabel={bt('เพิ่มบทความ')}
            max={POSTS_MAX_ITEMS}
            create={newPost}
            onChange={(items) => onChange('props.items', items)}
          >
            {(index) => {
              const item = props.items[index];
              if (!item) return null;
              return (
                <>
                  <ImagePicker
                    label={bt('รูปปกบทความ')}
                    value={item.image?.src ?? null}
                    alt={item.image?.alt ?? ''}
                    disabled={!mediaPicker}
                    hint={mediaPicker ? undefined : bt('ยังไม่ได้เชื่อมคลังรูปภาพในหน้านี้')}
                    onPick={() => {
                      void mediaPicker
                        ?.pick({ aspect: 'wide' })
                        .then((picked) => {
                          if (picked) {
                            updateItem(index, { image: imageFromPick(picked, item.title) });
                          }
                        })
                        .catch(() => undefined);
                    }}
                    onChange={(url) => updateItem(index, { image: imageFromUrl(url, item.title) })}
                  />
                  <TextField
                    label={bt('หมวดหมู่')}
                    value={item.category}
                    onChange={(event) => updateItem(index, { category: event.target.value })}
                  />
                  <TextField
                    label={bt('หัวข้อบทความ')}
                    value={item.title}
                    onChange={(event) => updateItem(index, { title: event.target.value })}
                  />
                  <Textarea
                    label={bt('เกริ่นนำ')}
                    rows={2}
                    value={item.excerpt}
                    onChange={(event) => updateItem(index, { excerpt: event.target.value })}
                  />
                  <TextField
                    label={bt('วันที่ (ตามที่ต้องการแสดง)')}
                    hint={bt('เช่น 12 ต.ค. 2026')}
                    value={item.date}
                    onChange={(event) => updateItem(index, { date: event.target.value })}
                  />
                  <TextField
                    label={bt('ผู้เขียน')}
                    value={item.author}
                    onChange={(event) => updateItem(index, { author: event.target.value })}
                  />
                  <TextField
                    label={bt('ลิงก์บทความ')}
                    hint={bt('เช่น /posts/my-article')}
                    value={item.link}
                    onChange={(event) => updateItem(index, { link: event.target.value })}
                  />
                  <TextField
                    label={bt('ข้อความลิงก์')}
                    value={item.buttonLabel}
                    onChange={(event) => updateItem(index, { buttonLabel: event.target.value })}
                  />
                </>
              );
            }}
          </PanelItemList>
        </PanelSection>
      )}

      <CommonStylePanel style={style} mode={mode} onChange={onChange} />
    </>
  );
};
