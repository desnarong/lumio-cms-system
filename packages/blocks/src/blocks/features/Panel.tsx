'use client';

import { Select, TextField, Textarea } from '@lumio/ui';
import { CommonStylePanel, PanelItemList, PanelSection } from '../../engine/panel.js';
import type { BlockPanelProps } from '../../types.js';
import {
  FEATURES_MAX_ITEMS,
  FEATURE_COLUMNS,
  type FeatureColumns,
  type FeatureItem,
  type FeaturesProps,
} from './schema.js';

const COLUMN_LABELS: Record<FeatureColumns, string> = {
  '2': '2 คอลัมน์',
  '3': '3 คอลัมน์',
  '4': '4 คอลัมน์',
};

const newItem = (): FeatureItem => ({
  icon: '★',
  title: 'จุดเด่นใหม่',
  description: 'อธิบายสั้น ๆ ว่าลูกค้าได้อะไรจากจุดเด่นนี้',
});

export const FeaturesPanel = ({ props, style, mode, onChange }: BlockPanelProps<FeaturesProps>) => (
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
        label="จำนวนคอลัมน์"
        value={props.columns}
        options={FEATURE_COLUMNS.map((column) => ({
          value: column,
          label: COLUMN_LABELS[column],
        }))}
        onChange={(event) => onChange('props.columns', event.target.value)}
      />
    </PanelSection>

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
          return (
            <>
              <TextField
                label="ไอคอน (อีโมจิ)"
                value={item.icon}
                onChange={(event) => onChange(`props.items.${index}.icon`, event.target.value)}
              />
              <TextField
                label="ชื่อจุดเด่น"
                value={item.title}
                onChange={(event) => onChange(`props.items.${index}.title`, event.target.value)}
              />
              <Textarea
                label="คำอธิบาย"
                rows={3}
                value={item.description}
                onChange={(event) =>
                  onChange(`props.items.${index}.description`, event.target.value)
                }
              />
            </>
          );
        }}
      </PanelItemList>
    </PanelSection>

    <CommonStylePanel style={style} mode={mode} onChange={onChange} />
  </>
);
