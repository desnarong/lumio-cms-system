'use client';

import type { ReactNode } from 'react';
import { Button, Select } from '@lumio/ui';
import {
  ANIMATIONS,
  BACKGROUNDS,
  SPACING_SCALE,
  type Animation,
  type Background,
  type BlockEditorMode,
  type BlockStyle,
  type SpacingScale,
} from '@lumio/shared';

export interface PanelSectionProps {
  title: ReactNode;
  children: ReactNode;
}

/** Groups panel controls under a heading so the sidebar stays scannable. */
export const PanelSection = ({ title, children }: PanelSectionProps) => (
  <section className="lumio-panel-section">
    <h3 className="lumio-panel-section__title">{title}</h3>
    <div className="lumio-panel-section__body">{children}</div>
  </section>
);

const SPACING_LABELS: Record<SpacingScale, string> = {
  none: 'ไม่มี',
  sm: 'เล็ก',
  md: 'กลาง',
  lg: 'ใหญ่',
  xl: 'ใหญ่มาก',
};

const BACKGROUND_LABELS: Record<Background, string> = {
  none: 'ไม่มี',
  surface: 'พื้นผิว',
  muted: 'เทาอ่อน',
  accent: 'สีเน้น',
  brand: 'สีแบรนด์',
};

const ANIMATION_LABELS: Record<Animation, string> = {
  none: 'ไม่มี',
  'fade-up': 'เลื่อนขึ้นแล้วจาง',
  'fade-in': 'จางเข้า',
  'zoom-in': 'ขยายเข้า',
};

const spacingOptions = SPACING_SCALE.map((value) => ({ value, label: SPACING_LABELS[value] }));
const backgroundOptions = BACKGROUNDS.map((value) => ({ value, label: BACKGROUND_LABELS[value] }));
const animationOptions = ANIMATIONS.map((value) => ({ value, label: ANIMATION_LABELS[value] }));

export interface CommonStylePanelProps {
  style: BlockStyle;
  mode: BlockEditorMode;
  onChange: (path: string, value: unknown) => void;
}

/**
 * Style controls every block shares. Blocks compose it with their own content controls
 * so spacing, background and visibility behave the same everywhere.
 */
export const CommonStylePanel = ({ style, mode, onChange }: CommonStylePanelProps) => (
  <>
    <PanelSection title="หน้าตา">
      <Select
        label="ระยะห่างบน-ล่าง"
        value={style.paddingY}
        options={spacingOptions}
        onChange={(event) => onChange('style.paddingY', event.target.value)}
      />
      <Select
        label="ระยะห่างซ้าย-ขวา"
        value={style.paddingX}
        options={spacingOptions}
        onChange={(event) => onChange('style.paddingX', event.target.value)}
      />
      <Select
        label="พื้นหลัง"
        value={style.background}
        options={backgroundOptions}
        onChange={(event) => onChange('style.background', event.target.value)}
      />
    </PanelSection>

    {mode === 'pro' ? (
      <PanelSection title="ขั้นสูง">
        <Select
          label="อนิเมชัน"
          value={style.animation}
          options={animationOptions}
          onChange={(event) => onChange('style.animation', event.target.value)}
        />
        <Select
          label="แสดงบนมือถือ"
          value={style.visibility.mobile ? 'yes' : 'no'}
          options={[
            { value: 'yes', label: 'แสดง' },
            { value: 'no', label: 'ซ่อน' },
          ]}
          onChange={(event) => onChange('style.visibility.mobile', event.target.value === 'yes')}
        />
        <Select
          label="แสดงบนแท็บเล็ต"
          value={style.visibility.tablet ? 'yes' : 'no'}
          options={[
            { value: 'yes', label: 'แสดง' },
            { value: 'no', label: 'ซ่อน' },
          ]}
          onChange={(event) => onChange('style.visibility.tablet', event.target.value === 'yes')}
        />
        <Select
          label="แสดงบนเดสก์ท็อป"
          value={style.visibility.desktop ? 'yes' : 'no'}
          options={[
            { value: 'yes', label: 'แสดง' },
            { value: 'no', label: 'ซ่อน' },
          ]}
          onChange={(event) => onChange('style.visibility.desktop', event.target.value === 'yes')}
        />
      </PanelSection>
    ) : null}
  </>
);

export interface PanelItemListProps {
  items: readonly unknown[];
  addLabel: string;
  /** Upper bound for the list, matching the block schema. */
  max?: number;
  onChange: (items: unknown[]) => void;
  create: () => unknown;
  children: (index: number) => ReactNode;
}

/** Add/remove wrapper for repeatable fields (hero buttons, feature cards, ...). */
export const PanelItemList = ({
  items,
  addLabel,
  max,
  onChange,
  create,
  children,
}: PanelItemListProps) => {
  const canAdd = max === undefined || items.length < max;
  return (
    <div className="lumio-panel-list">
      {items.map((_item, index) => (
        <div className="lumio-panel-list__item" key={index}>
          <div className="lumio-panel-list__fields">{children(index)}</div>
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={() => onChange(items.filter((__, position) => position !== index))}
          >
            ลบ
          </Button>
        </div>
      ))}
      {canAdd ? (
        <Button
          type="button"
          variant="secondary"
          size="sm"
          onClick={() => onChange([...items, create()])}
        >
          {addLabel}
        </Button>
      ) : null}
    </div>
  );
};
