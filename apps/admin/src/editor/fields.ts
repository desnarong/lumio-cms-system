import { createTranslator, type MessageKey, type Translate } from '@lumio/ui';

/**
 * Wording for the text fields of a block. The editor reads the fields straight
 * from the rendered page (`data-editable-path`), so the assistant can offer
 * "ข้อความ", "หัวข้อ", "รายการ 1: ชื่อ" instead of raw prop paths.
 */

const LABEL_KEYS: Record<string, MessageKey> = {
  text: 'editor.field.text',
  heading: 'editor.field.heading',
  subheading: 'editor.field.subheading',
  label: 'editor.field.buttonLabel',
  caption: 'editor.field.caption',
  title: 'editor.field.title',
  description: 'editor.field.description',
  icon: 'editor.field.icon',
  placeholder: 'editor.field.placeholder',
  items: 'editor.field.items',
  buttons: 'editor.field.buttons',
  links: 'editor.field.links',
  fields: 'editor.field.fields',
};

interface Segment {
  key: string;
  /** 1-based position when the segment is `items[0]`, otherwise null. */
  index: number | null;
}

const parseSegment = (segment: string): Segment => {
  const match = /^([^[\]]+)(?:\[(\d+)\])?$/.exec(segment);
  if (!match || match[1] === undefined) return { key: segment, index: null };
  return { key: match[1], index: match[2] === undefined ? null : Number(match[2]) + 1 };
};

/** Latin keys still read better as "Some word" than as "someWord". */
const humanise = (key: string): string => {
  const spaced = key.replace(/[A-Z]/g, (letter) => ` ${letter.toLowerCase()}`).trim();
  return spaced.charAt(0).toUpperCase() + spaced.slice(1);
};

const labelFor = (key: string, t: Translate): string => {
  const messageKey = LABEL_KEYS[key];
  return messageKey ? t(messageKey) : humanise(key);
};

/** Thai unless the caller passes the translator of the surrounding provider. */
export const labelForPath = (path: string, t: Translate = createTranslator('th')): string => {
  const segments = path
    .split('.')
    .filter((segment) => segment.length > 0 && segment !== 'props' && segment !== 'style');
  const last = parseSegment(segments[segments.length - 1] ?? '');
  const parent = segments.length > 1 ? parseSegment(segments[segments.length - 2] ?? '') : null;

  const base = `${labelFor(last.key, t)}${last.index === null ? '' : ` ${last.index}`}`;
  if (parent && parent.index !== null) {
    return `${labelFor(parent.key, t)} ${parent.index}: ${base}`;
  }
  return base;
};
