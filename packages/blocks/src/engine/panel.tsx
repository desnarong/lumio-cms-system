'use client';

import {
  createContext,
  useContext,
  useEffect,
  useId,
  useRef,
  useState,
  type ReactNode,
} from 'react';
import { Button, ColorPicker, Icon, Select, Slider, Switch, TextField } from '@lumio/ui';
import { cn } from '@lumio/ui/cn';
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
import { alignmentOptions } from '../blocks/common.js';
import { literalColors } from '@lumio/tokens';
import { bt } from '../i18n.js';

interface PanelAccordionCommand {
  open: boolean;
  id: number;
}

interface PanelAccordionContextValue {
  command: PanelAccordionCommand | null;
  register: () => number;
}

const PanelAccordionContext = createContext<PanelAccordionContextValue | null>(null);

export interface PanelAccordionProps {
  children: ReactNode;
}

/**
 * Keeps a long block panel usable: every group collapses, the first group stays
 * open, and one bar expands or folds the whole panel at once.
 */
export const PanelAccordion = ({ children }: PanelAccordionProps) => {
  const [command, setCommand] = useState<PanelAccordionCommand | null>(null);
  const counter = useRef(0);

  const register = (): number => {
    const index = counter.current;
    counter.current += 1;
    return index;
  };

  return (
    <PanelAccordionContext.Provider value={{ command, register }}>
      <div className="lumio-panel-accordion">
        <div className="lumio-panel-accordion__bar">
          <Button
            type="button"
            size="sm"
            variant="ghost"
            onClick={() => setCommand({ open: true, id: Date.now() })}
          >
            {bt('ขยายทั้งหมด')}
          </Button>
          <Button
            type="button"
            size="sm"
            variant="ghost"
            onClick={() => setCommand({ open: false, id: Date.now() })}
          >
            {bt('ย่อทั้งหมด')}
          </Button>
        </div>
        {children}
      </div>
    </PanelAccordionContext.Provider>
  );
};

export interface PanelSectionProps {
  title: ReactNode;
  children: ReactNode;
  /** Open this group on mount; the first group is open unless told otherwise. */
  defaultOpen?: boolean;
}

/** A collapsible group of panel controls; content stays mounted when folded. */
export const PanelSection = ({ title, children, defaultOpen }: PanelSectionProps) => {
  const context = useContext(PanelAccordionContext);
  const [position] = useState(() => context?.register() ?? 0);
  const [open, setOpen] = useState(defaultOpen ?? position === 0);
  const bodyId = useId();

  useEffect(() => {
    if (context?.command) setOpen(context.command.open);
  }, [context?.command]);

  return (
    <section className={cn('lumio-panel-section', open && 'is-open')}>
      <button
        type="button"
        className="lumio-panel-section__toggle"
        aria-expanded={open}
        aria-controls={bodyId}
        onClick={() => setOpen((current) => !current)}
      >
        <h3 className="lumio-panel-section__title">{title}</h3>
        <Icon name={open ? 'chevron-up' : 'chevron-down'} size={16} />
      </button>
      <div id={bodyId} className="lumio-panel-section__body" hidden={!open}>
        {children}
      </div>
    </section>
  );
};

const SPACING_LABELS = (): Record<SpacingScale, string> => ({
  none: bt('ไม่มี'),
  sm: bt('เล็ก'),
  md: bt('กลาง'),
  lg: bt('ใหญ่'),
  xl: bt('ใหญ่มาก'),
});

const BACKGROUND_LABELS = (): Record<Background, string> => ({
  none: bt('ไม่มี'),
  surface: bt('พื้นผิว'),
  muted: bt('เทาอ่อน'),
  accent: bt('สีเน้น'),
  brand: bt('สีแบรนด์'),
});

const ANIMATION_LABELS = (): Record<Animation, string> => ({
  none: bt('ไม่มี'),
  'fade-up': bt('เลื่อนขึ้นแล้วจาง'),
  'fade-in': bt('จางเข้า'),
  'zoom-in': bt('ขยายเข้า'),
});

const spacingOptions = SPACING_SCALE.map((value) => ({ value, label: SPACING_LABELS()[value] }));
const backgroundOptions = BACKGROUNDS.map((value) => ({
  value,
  label: BACKGROUND_LABELS()[value],
}));
const animationOptions = ANIMATIONS.map((value) => ({ value, label: ANIMATION_LABELS()[value] }));

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
    <PanelSection title={bt('ระยะห่างและพื้นหลัง')}>
      <Select
        label={bt('ระยะห่างบน-ล่าง')}
        value={style.paddingY}
        options={spacingOptions}
        onChange={(event) => onChange('style.paddingY', event.target.value)}
      />
      <TextField
        label={bt('ระยะห่างบน-ล่างกำหนดเอง (px)')}
        hint={bt('เว้นว่างเพื่อใช้ค่าด้านบน — ถ้ากำหนดบน/ล่างแยกไว้ จะใช้ค่านั้นแทน')}
        type="number"
        min={0}
        max={240}
        value={style.paddingYpx === undefined ? '' : String(style.paddingYpx)}
        onChange={(event) => {
          const raw = event.target.value.trim();
          const value =
            raw === '' ? undefined : Math.min(240, Math.max(0, Math.round(Number(raw) || 0)));
          onChange('style.paddingYpx', value);
          // The two separate fields win over this one; clear them so the number typed here applies.
          if (value !== undefined) {
            onChange('style.paddingTopPx', undefined);
            onChange('style.paddingBottomPx', undefined);
          }
        }}
      />
      <Select
        label={bt('ระยะห่างซ้าย-ขวา')}
        value={style.paddingX}
        options={spacingOptions}
        onChange={(event) => onChange('style.paddingX', event.target.value)}
      />
      <TextField
        label={bt('ระยะห่างซ้าย-ขวากำหนดเอง (px)')}
        hint={bt('เว้นว่างเพื่อใช้ค่าด้านบน')}
        type="number"
        min={0}
        max={240}
        value={style.paddingXpx === undefined ? '' : String(style.paddingXpx)}
        onChange={(event) => {
          const raw = event.target.value.trim();
          onChange(
            'style.paddingXpx',
            raw === '' ? undefined : Math.min(240, Math.max(0, Math.round(Number(raw) || 0))),
          );
        }}
      />
      <TextField
        label={bt('ระยะห่างด้านบน (px)')}
        hint={bt('เว้นว่างเพื่อใช้ระยะบน-ล่าง')}
        type="number"
        min={0}
        max={240}
        value={style.paddingTopPx === undefined ? '' : String(style.paddingTopPx)}
        onChange={(event) => {
          const raw = event.target.value.trim();
          onChange(
            'style.paddingTopPx',
            raw === '' ? undefined : Math.min(240, Math.max(0, Math.round(Number(raw) || 0))),
          );
        }}
      />
      <TextField
        label={bt('ระยะห่างด้านล่าง (px)')}
        hint={bt('เว้นว่างเพื่อใช้ระยะบน-ล่าง')}
        type="number"
        min={0}
        max={240}
        value={style.paddingBottomPx === undefined ? '' : String(style.paddingBottomPx)}
        onChange={(event) => {
          const raw = event.target.value.trim();
          onChange(
            'style.paddingBottomPx',
            raw === '' ? undefined : Math.min(240, Math.max(0, Math.round(Number(raw) || 0))),
          );
        }}
      />
      <TextField
        label={bt('เลื่อนบล็อกขึ้น/ลง (px)')}
        hint={bt('ค่าลบ = เลื่อนขึ้น, ค่าบวก = เลื่อนลง')}
        type="number"
        min={-1200}
        max={1200}
        value={style.marginTopPx === undefined ? '' : String(style.marginTopPx)}
        onChange={(event) => {
          const raw = event.target.value.trim();
          onChange(
            'style.marginTopPx',
            raw === '' ? undefined : Math.min(1200, Math.max(-1200, Math.round(Number(raw) || 0))),
          );
        }}
      />
      <TextField
        label={bt('ความกว้างสูงสุด (px)')}
        hint={bt('เว้นว่างเพื่อเต็มความกว้างของหน้า')}
        type="number"
        min={160}
        max={2400}
        value={style.widthPx === undefined ? '' : String(style.widthPx)}
        onChange={(event) => {
          const raw = event.target.value.trim();
          onChange(
            'style.widthPx',
            raw === '' ? undefined : Math.min(2400, Math.max(160, Math.round(Number(raw) || 0))),
          );
        }}
      />
      <TextField
        label={bt('ความสูงขั้นต่ำ (px)')}
        hint={bt('เว้นว่างเพื่อให้สูงตามเนื้อหา')}
        type="number"
        min={80}
        max={2400}
        value={style.heightPx === undefined ? '' : String(style.heightPx)}
        onChange={(event) => {
          const raw = event.target.value.trim();
          onChange(
            'style.heightPx',
            raw === '' ? undefined : Math.min(2400, Math.max(80, Math.round(Number(raw) || 0))),
          );
        }}
      />
      <Select
        label={bt('พื้นหลัง')}
        value={style.background}
        options={backgroundOptions}
        onChange={(event) => onChange('style.background', event.target.value)}
      />
      <ColorPicker
        label={bt('สีพื้นหลังกำหนดเอง')}
        hint={bt('เลือกสีได้ตามใจ สีนี้จะทับค่าพื้นหลังด้านบนและเต็มความกว้างของแถบ')}
        value={style.backgroundColor ?? literalColors.backgroundSeed}
        onChange={(value) => onChange('style.backgroundColor', value)}
      />
      {style.backgroundColor ? (
        <Button
          type="button"
          variant="ghost"
          size="sm"
          onClick={() => onChange('style.backgroundColor', undefined)}
        >
          {bt('ล้างสีพื้นหลัง')}
        </Button>
      ) : null}
      <Switch
        label={bt('พื้นหลังเต็มความกว้างหน้าจอ')}
        description={bt('ปิดเมื่อต้องการให้สีพื้นหลังอยู่เฉพาะคอลัมน์เนื้อหา')}
        checked={style.backgroundFullWidth !== false}
        onChange={(checked) => onChange('style.backgroundFullWidth', checked)}
      />
      <Select
        label={bt('ตำแหน่งข้อความ')}
        value={style.textAlign ?? 'inherit'}
        options={[{ value: 'inherit', label: bt('ตามต้นแบบ') }, ...alignmentOptions()]}
        onChange={(event) =>
          onChange(
            'style.textAlign',
            event.target.value === 'inherit' ? undefined : event.target.value,
          )
        }
      />
      <Slider
        label={bt('ขนาดข้อความ (%)')}
        min={50}
        max={300}
        step={5}
        value={style.textScale ?? 100}
        formatValue={(value) => `${value}%`}
        onChange={(value) => onChange('style.textScale', value === 100 ? undefined : value)}
      />
      <TextField
        label={bt('เลื่อนข้อความแนวนอน (px)')}
        hint={bt('ค่าลบเลื่อนไปทางซ้าย ค่าบวกเลื่อนไปทางขวา')}
        type="number"
        min={-600}
        max={600}
        value={String(style.offsetX ?? 0)}
        onChange={(event) =>
          onChange(
            'style.offsetX',
            Math.min(600, Math.max(-600, Math.round(Number(event.target.value) || 0))),
          )
        }
      />
      <TextField
        label={bt('เลื่อนข้อความแนวตั้ง (px)')}
        hint={bt('ค่าลบเลื่อนขึ้น ค่าบวกเลื่อนลง')}
        type="number"
        min={-600}
        max={600}
        value={String(style.offsetY ?? 0)}
        onChange={(event) =>
          onChange(
            'style.offsetY',
            Math.min(600, Math.max(-600, Math.round(Number(event.target.value) || 0))),
          )
        }
      />
      <div className="lumio-panel-nudge" role="group" aria-label={bt('ย้ายข้อความทีละ 8 พิกเซล')}>
        <Button
          type="button"
          variant="secondary"
          size="sm"
          aria-label={bt('ย้ายข้อความขึ้น')}
          onClick={() =>
            onChange('style.offsetY', Math.min(600, Math.max(-600, (style.offsetY ?? 0) - 8)))
          }
        >
          <Icon name="arrow-up" size={16} />
        </Button>
        <Button
          type="button"
          variant="secondary"
          size="sm"
          aria-label={bt('ย้ายข้อความลง')}
          onClick={() =>
            onChange('style.offsetY', Math.min(600, Math.max(-600, (style.offsetY ?? 0) + 8)))
          }
        >
          <Icon name="arrow-down" size={16} />
        </Button>
        <Button
          type="button"
          variant="secondary"
          size="sm"
          aria-label={bt('ย้ายข้อความไปทางซ้าย')}
          onClick={() =>
            onChange('style.offsetX', Math.min(600, Math.max(-600, (style.offsetX ?? 0) - 8)))
          }
        >
          <Icon name="arrow-left" size={16} />
        </Button>
        <Button
          type="button"
          variant="secondary"
          size="sm"
          aria-label={bt('ย้ายข้อความไปทางขวา')}
          onClick={() =>
            onChange('style.offsetX', Math.min(600, Math.max(-600, (style.offsetX ?? 0) + 8)))
          }
        >
          <Icon name="arrow-right" size={16} />
        </Button>
      </div>
      {style.offsetX || style.offsetY ? (
        <Button
          type="button"
          variant="ghost"
          size="sm"
          onClick={() => {
            onChange('style.offsetX', 0);
            onChange('style.offsetY', 0);
          }}
        >
          {bt('คืนตำแหน่งเดิม')}
        </Button>
      ) : null}
      {style.textScale && style.textScale !== 100 ? (
        <Button
          type="button"
          variant="ghost"
          size="sm"
          onClick={() => onChange('style.textScale', undefined)}
        >
          {bt('คืนขนาดข้อความเดิม')}
        </Button>
      ) : null}
    </PanelSection>

    {mode === 'pro' ? (
      <PanelSection title={bt('ขั้นสูง')}>
        <Select
          label={bt('อนิเมชัน')}
          value={style.animation}
          options={animationOptions}
          onChange={(event) => onChange('style.animation', event.target.value)}
        />
        <Select
          label={bt('แสดงบนมือถือ')}
          value={style.visibility.mobile ? 'yes' : 'no'}
          options={[
            { value: 'yes', label: bt('แสดง') },
            { value: 'no', label: bt('ซ่อน') },
          ]}
          onChange={(event) => onChange('style.visibility.mobile', event.target.value === 'yes')}
        />
        <Select
          label={bt('แสดงบนแท็บเล็ต')}
          value={style.visibility.tablet ? 'yes' : 'no'}
          options={[
            { value: 'yes', label: bt('แสดง') },
            { value: 'no', label: bt('ซ่อน') },
          ]}
          onChange={(event) => onChange('style.visibility.tablet', event.target.value === 'yes')}
        />
        <Select
          label={bt('แสดงบนเดสก์ท็อป')}
          value={style.visibility.desktop ? 'yes' : 'no'}
          options={[
            { value: 'yes', label: bt('แสดง') },
            { value: 'no', label: bt('ซ่อน') },
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
            {bt('ลบ')}
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
