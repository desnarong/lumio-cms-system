'use client';

import { ImagePicker, Select, Switch, TextField, Textarea } from '@lumio/ui';
import { useMediaPicker } from '../../engine/media-picker.js';
import { CommonStylePanel, PanelItemList, PanelSection } from '../../engine/panel.js';
import type { BlockPanelProps } from '../../types.js';
import { imageFromPick, imageFromUrl } from '../common.js';
import {
  PRODUCT_COLUMNS,
  PRODUCT_SOURCE_LIMITS,
  PRODUCT_SOURCES,
  PRODUCTS_MAX_ITEMS,
  type ProductCard,
  type ProductColumns,
  type ProductSource,
  type ProductSourceLimit,
  type ProductsProps,
} from './schema.js';

const COLUMN_LABELS: Record<ProductColumns, string> = {
  '2': '2 คอลัมน์',
  '3': '3 คอลัมน์',
  '4': '4 คอลัมน์',
};

const SOURCE_LABELS: Record<ProductSource, string> = {
  manual: 'ตั้งสินค้าเองในหน้านี้',
  shop: 'ดึงจากร้านค้า (อัปเดตอัตโนมัติ)',
};

const SOURCE_LIMIT_LABELS: Record<ProductSourceLimit, string> = {
  3: '3 ชิ้น',
  6: '6 ชิ้น',
  9: '9 ชิ้น',
  12: '12 ชิ้น',
};

const newProduct = (): ProductCard => ({
  image: null,
  name: 'สินค้าใหม่',
  description: 'อธิบายสินค้าสั้น ๆ ให้ลูกค้าเห็นคุณค่า',
  price: 0,
  currency: '฿',
  badge: '',
  link: '/shop',
  buttonLabel: 'ดูสินค้า',
  soldOut: false,
});

export const ProductsPanel = ({ props, style, mode, onChange }: BlockPanelProps<ProductsProps>) => {
  const mediaPicker = useMediaPicker();

  const updateItem = (index: number, patch: Partial<ProductCard>): void => {
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
          label="แหล่งสินค้า"
          hint="ดึงจากร้านค้าเพื่อให้สินค้าใหม่ขึ้นเอง และสินค้าที่ลบแล้วหายไปเอง"
          value={props.source}
          options={PRODUCT_SOURCES.map((source) => ({
            value: source,
            label: SOURCE_LABELS[source],
          }))}
          onChange={(event) => onChange('props.source', event.target.value)}
        />
        <Select
          label="จำนวนคอลัมน์"
          value={props.columns}
          options={PRODUCT_COLUMNS.map((column) => ({
            value: column,
            label: COLUMN_LABELS[column],
          }))}
          onChange={(event) => onChange('props.columns', event.target.value)}
        />
        <Switch
          label="แสดงราคา"
          checked={props.showPrice}
          onChange={(checked) => onChange('props.showPrice', checked)}
        />
        <Switch
          label="แสดงคำอธิบายสินค้า"
          checked={props.showDescription}
          onChange={(checked) => onChange('props.showDescription', checked)}
        />
      </PanelSection>

      {props.source === 'shop' ? (
        <PanelSection title="สินค้าจากร้านค้า">
          <p className="lumio-panel-hint">
            สินค้าที่เผยแพร่ในร้านจะขึ้นตรงนี้อัตโนมัติ สินค้าที่ลบหรือเก็บเข้าคลังจะไม่แสดง
          </p>
          <TextField
            label="หมวดหมู่สินค้า (ไม่บังคับ)"
            hint="เว้นว่างเพื่อแสดงทุกหมวดหมู่"
            value={props.sourceCategory}
            onChange={(event) => onChange('props.sourceCategory', event.target.value)}
          />
          <Select
            label="จำนวนสินค้าที่แสดง"
            value={String(props.sourceLimit)}
            options={PRODUCT_SOURCE_LIMITS.map((limit) => ({
              value: String(limit),
              label: SOURCE_LIMIT_LABELS[limit],
            }))}
            onChange={(event) => onChange('props.sourceLimit', Number(event.target.value) || 6)}
          />
        </PanelSection>
      ) : (
        <PanelSection title={`สินค้า (${props.items.length}/${PRODUCTS_MAX_ITEMS})`}>
          <PanelItemList
            items={props.items}
            addLabel="เพิ่มสินค้า"
            max={PRODUCTS_MAX_ITEMS}
            create={newProduct}
            onChange={(items) => onChange('props.items', items)}
          >
            {(index) => {
              const item = props.items[index];
              if (!item) return null;
              return (
                <>
                  <ImagePicker
                    label="รูปสินค้า"
                    value={item.image?.src ?? null}
                    alt={item.image?.alt ?? ''}
                    disabled={!mediaPicker}
                    hint={
                      mediaPicker ? 'ภาพจัตุรัสจะดูเรียบร้อยที่สุด' : 'ยังไม่ได้เชื่อมคลังรูปภาพในหน้านี้'
                    }
                    onPick={() => {
                      void mediaPicker
                        ?.pick({ aspect: 'square' })
                        .then((picked) => {
                          if (picked) {
                            updateItem(index, { image: imageFromPick(picked, item.name) });
                          }
                        })
                        .catch(() => undefined);
                    }}
                    onChange={(url) => updateItem(index, { image: imageFromUrl(url, item.name) })}
                  />
                  <TextField
                    label="ชื่อสินค้า"
                    value={item.name}
                    onChange={(event) => updateItem(index, { name: event.target.value })}
                  />
                  <Textarea
                    label="คำอธิบายสินค้า"
                    rows={2}
                    value={item.description}
                    onChange={(event) => updateItem(index, { description: event.target.value })}
                  />
                  <TextField
                    label="ราคา"
                    type="number"
                    min={0}
                    value={String(item.price)}
                    onChange={(event) =>
                      updateItem(index, { price: Math.max(0, Number(event.target.value) || 0) })
                    }
                  />
                  <TextField
                    label="ราคาก่อนลด (ไม่บังคับ)"
                    hint="ใส่เมื่อต้องการขีดราคาเดิมทิ้ง"
                    type="number"
                    min={0}
                    value={item.compareAtPrice === undefined ? '' : String(item.compareAtPrice)}
                    onChange={(event) => {
                      const raw = event.target.value.trim();
                      updateItem(index, {
                        compareAtPrice: raw === '' ? undefined : Math.max(0, Number(raw) || 0),
                      });
                    }}
                  />
                  <TextField
                    label="สกุลเงิน"
                    value={item.currency}
                    onChange={(event) => updateItem(index, { currency: event.target.value })}
                  />
                  <TextField
                    label="ป้ายกำกับ"
                    hint="เช่น ขายดี หรือ ใหม่"
                    value={item.badge}
                    onChange={(event) => updateItem(index, { badge: event.target.value })}
                  />
                  <TextField
                    label="ลิงก์สินค้า"
                    hint="เช่น /shop หรือ https://..."
                    value={item.link}
                    onChange={(event) => updateItem(index, { link: event.target.value })}
                  />
                  <TextField
                    label="ข้อความบนปุ่ม"
                    value={item.buttonLabel}
                    onChange={(event) => updateItem(index, { buttonLabel: event.target.value })}
                  />
                  <Switch
                    label="สินค้าหมด"
                    checked={item.soldOut}
                    onChange={(checked) => updateItem(index, { soldOut: checked })}
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
          value={props.cardStyle}
          options={[
            { value: 'card', label: 'การ์ดมีขอบ' },
            { value: 'plain', label: 'เรียบ (ไม่มีขอบ)' },
          ]}
          onChange={(event) => onChange('props.cardStyle', event.target.value)}
        />
      </PanelSection>

      <CommonStylePanel style={style} mode={mode} onChange={onChange} />
    </>
  );
};
